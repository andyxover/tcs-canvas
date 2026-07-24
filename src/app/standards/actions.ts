'use server'

import { revalidatePath } from 'next/cache'
import { addStandards, resetStandards } from '@/lib/bc-curriculum'
import { parseStandards } from '@/lib/standards-import'

export interface ImportState {
  status: 'idle' | 'preview' | 'done' | 'error'
  message?: string
  /** Raw text carried through preview → confirm so the user doesn't re-paste. */
  raw?: string
  preview?: {
    total: number
    duplicates: number
    issues: { row: number; message: string }[]
    sample: { code: string; subject: string; grade: string; kind: string; text: string }[]
    curricula: { subject: string; grade: string; count: number }[]
  }
  result?: { added: number; updated: number }
}

/** Parse and summarize without touching the catalogue. */
export async function previewImportAction(_prev: ImportState, fd: FormData): Promise<ImportState> {
  const file = fd.get('file')
  let raw = typeof fd.get('raw') === 'string' ? (fd.get('raw') as string) : ''
  if (file instanceof File && file.size > 0) raw = await file.text()

  const { standards, issues, duplicates } = parseStandards(raw)

  if (standards.length === 0) {
    return {
      status: 'error',
      raw,
      message: issues[0]?.message ?? 'No standards found in that input.',
      preview: { total: 0, duplicates, issues, sample: [], curricula: [] },
    }
  }

  const byCurriculum = new Map<string, { subject: string; grade: string; count: number }>()
  for (const s of standards) {
    const key = `${s.subject}||${s.grade}`
    const cur = byCurriculum.get(key)
    if (cur) cur.count += 1
    else byCurriculum.set(key, { subject: s.subject, grade: s.grade, count: 1 })
  }

  return {
    status: 'preview',
    raw,
    preview: {
      total: standards.length,
      duplicates,
      issues,
      sample: standards.slice(0, 8).map((s) => ({
        code: s.code,
        subject: s.subject,
        grade: s.grade,
        kind: s.kind,
        text: s.text,
      })),
      curricula: [...byCurriculum.values()].sort(
        (a, b) => a.grade.localeCompare(b.grade, undefined, { numeric: true }) || a.subject.localeCompare(b.subject),
      ),
    },
  }
}

/** Commit a previewed import into the live catalogue. */
export async function confirmImportAction(_prev: ImportState, fd: FormData): Promise<ImportState> {
  const raw = typeof fd.get('raw') === 'string' ? (fd.get('raw') as string) : ''
  const { standards } = parseStandards(raw)
  if (standards.length === 0) {
    return { status: 'error', message: 'Nothing to import — re-check the file.' }
  }
  const result = addStandards(standards)
  revalidatePath('/standards', 'page')
  revalidatePath('/courses', 'layout')
  return {
    status: 'done',
    result,
    message: `Imported ${result.added} new and updated ${result.updated} existing standard${result.added + result.updated === 1 ? '' : 's'}.`,
  }
}

/** Drop every imported standard, restoring the shipped catalogue. */
export async function resetStandardsAction(): Promise<void> {
  resetStandards()
  revalidatePath('/standards', 'page')
  revalidatePath('/courses', 'layout')
}
