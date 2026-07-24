// Parser for importing BC learning standards from CSV or JSON.
//
// The built-in catalogue is a transcription; this is how a school loads the
// official data from curriculum.gov.bc.ca (or their own scope-and-sequence)
// without waiting on us. Import is idempotent: a row whose id matches an
// existing standard replaces it, so re-importing a corrected file fixes rather
// than duplicates.

import type { BcStandard, StandardKind } from './bc-curriculum'

export interface ParseIssue {
  /** 1-based row number as the user sees it (header excluded for CSV). */
  row: number
  message: string
}

export interface ParseResult {
  standards: BcStandard[]
  issues: ParseIssue[]
  /** Rows that parsed but duplicate another row in the same file. */
  duplicates: number
}

export const IMPORT_COLUMNS = ['subject', 'grade', 'kind', 'code', 'text', 'strand'] as const

/** Friendly spellings teachers actually type, mapped to our kind values. */
const KIND_ALIASES: Record<string, StandardKind> = {
  'big idea': 'big-idea',
  'big-idea': 'big-idea',
  bigidea: 'big-idea',
  bi: 'big-idea',
  'curricular competency': 'curricular-competency',
  'curricular-competency': 'curricular-competency',
  'curricular competencies': 'curricular-competency',
  competency: 'curricular-competency',
  cc: 'curricular-competency',
  content: 'content',
  co: 'content',
  'core competency': 'core-competency',
  'core-competency': 'core-competency',
  'core competencies': 'core-competency',
  core: 'core-competency',
}

function normalizeKind(raw: string): StandardKind | null {
  return KIND_ALIASES[raw.trim().toLowerCase()] ?? null
}

/** Stable id from subject/grade/code so re-imports update in place. */
export function standardId(subject: string, grade: string, code: string): string {
  return `${subject}-${grade}-${code}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Split one CSV line, honouring quoted fields (BC exports contain commas inside
 * standard text) and doubled quotes as an escaped quote.
 */
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

/** Split CSV text into lines, keeping newlines that sit inside quoted fields. */
function csvLines(text: string): string[] {
  const lines: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      cur += ch
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i += 1
      lines.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur.trim() !== '') lines.push(cur)
  return lines.filter((l) => l.trim() !== '')
}

function buildStandard(
  raw: Record<string, string>,
  rowNo: number,
  issues: ParseIssue[],
): BcStandard | null {
  const subject = (raw.subject ?? '').trim()
  const grade = (raw.grade ?? '').trim()
  const code = (raw.code ?? '').trim()
  const text = (raw.text ?? '').trim()
  const strand = (raw.strand ?? '').trim()
  const kindRaw = (raw.kind ?? '').trim()

  const missing = [
    !subject && 'subject',
    !grade && 'grade',
    !kindRaw && 'kind',
    !code && 'code',
    !text && 'text',
  ].filter(Boolean)
  if (missing.length > 0) {
    issues.push({ row: rowNo, message: `Missing ${missing.join(', ')}` })
    return null
  }

  const kind = normalizeKind(kindRaw)
  if (!kind) {
    issues.push({
      row: rowNo,
      message: `Unrecognized kind “${kindRaw}” — use Big Idea, Curricular Competency, Content, or Core Competency`,
    })
    return null
  }

  return {
    id: standardId(subject, grade, code),
    subject,
    grade,
    kind,
    code,
    text,
    ...(strand ? { strand } : {}),
  }
}

/** Parse pasted/uploaded text as CSV or JSON, returning standards + issues. */
export function parseStandards(input: string): ParseResult {
  const issues: ParseIssue[] = []
  const trimmed = input.trim()
  if (trimmed === '') return { standards: [], issues: [{ row: 0, message: 'Nothing to import.' }], duplicates: 0 }

  let rows: Record<string, string>[] = []

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    // JSON: an array of objects, or { standards: [...] }
    try {
      const parsed: unknown = JSON.parse(trimmed)
      const arr = Array.isArray(parsed)
        ? parsed
        : ((parsed as { standards?: unknown }).standards as unknown[] | undefined)
      if (!Array.isArray(arr)) {
        return { standards: [], issues: [{ row: 0, message: 'JSON must be an array of standards, or { "standards": [...] }.' }], duplicates: 0 }
      }
      rows = arr.map((o) => {
        const rec = (o ?? {}) as Record<string, unknown>
        const out: Record<string, string> = {}
        for (const key of IMPORT_COLUMNS) out[key] = String(rec[key] ?? '')
        return out
      })
    } catch {
      return { standards: [], issues: [{ row: 0, message: 'Could not parse JSON — check for a trailing comma or missing bracket.' }], duplicates: 0 }
    }
  } else {
    const lines = csvLines(trimmed)
    if (lines.length < 2) {
      return { standards: [], issues: [{ row: 0, message: 'CSV needs a header row plus at least one standard.' }], duplicates: 0 }
    }
    const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ''))
    const required = ['subject', 'grade', 'kind', 'code', 'text']
    const absent = required.filter((c) => !header.includes(c))
    if (absent.length > 0) {
      return {
        standards: [],
        issues: [{ row: 0, message: `Header is missing: ${absent.join(', ')}. Expected columns: ${IMPORT_COLUMNS.join(', ')}.` }],
        duplicates: 0,
      }
    }
    rows = lines.slice(1).map((line) => {
      const cells = splitCsvLine(line)
      const rec: Record<string, string> = {}
      header.forEach((h, i) => {
        rec[h] = cells[i] ?? ''
      })
      return rec
    })
  }

  const standards: BcStandard[] = []
  const seen = new Set<string>()
  let duplicates = 0

  rows.forEach((raw, i) => {
    const std = buildStandard(raw, i + 1, issues)
    if (!std) return
    if (seen.has(std.id)) {
      duplicates += 1
      // Last one wins, matching spreadsheet intuition.
      const at = standards.findIndex((s) => s.id === std.id)
      standards[at] = std
      return
    }
    seen.add(std.id)
    standards.push(std)
  })

  return { standards, issues, duplicates }
}

/** A ready-to-edit CSV template, offered as a download on the import page. */
export const CSV_TEMPLATE = `subject,grade,kind,code,text,strand
Science,11,Big Idea,CH11-BI-1,"Atoms and molecules are building blocks of matter.",
Science,11,Curricular Competency,CH11-CC-1,"Formulate multiple hypotheses and predict multiple outcomes.",Questioning and predicting
Science,11,Content,CH11-CO-1,"Atomic theory, models of the atom, and electron arrangement.",
`
