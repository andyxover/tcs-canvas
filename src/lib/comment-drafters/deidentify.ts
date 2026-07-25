import type { CommentEvidence } from '../report-comments'

/**
 * What actually leaves the building.
 *
 * The evidence packet is structured data — standard codes, proficiency levels,
 * counts — which is the whole reason this is tractable. A free-text "here is
 * everything about Ava" prompt could not be de-identified meaningfully; a list of
 * codes and levels can.
 *
 * The student is referred to as "the student" throughout, and their name is
 * scrubbed from the two fields that carry free text a human typed: assignment
 * titles and the teacher's feedback. The real name is re-inserted locally after
 * the model returns, so it never appears in the request at all.
 *
 * This is not anonymisation in any strong sense — a determined party holding the
 * course roster could re-identify from the pattern of standards. It is
 * data minimisation: nothing is sent that isn't needed to write the sentence.
 */

/** Scrub every name token from free text a teacher may have typed. */
export function scrubNames(text: string, names: string[]): string {
  let out = text
  for (const n of names) {
    for (const token of n.split(/\s+/).filter((t) => t.length > 2)) {
      out = out.replace(new RegExp(`\\b${escapeRegExp(token)}\\b`, 'gi'), '[student]')
    }
  }
  return out
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export interface DeidentifiedPacket {
  subject: string
  gradeLevel: string
  reporting: 'proficiency-scale' | 'letter-grade-and-percentage'
  standing?: { letter: string | null; percent: number | null }
  demonstrated: { code: string; kind: string; level: string; text: string; evidencedIn: string | null }[]
  developing: { code: string; kind: string; level: string; text: string }[]
  improvedOverTerm: { code: string; from: string; to: string }[]
  notAssessedCount: number
  workHabits: { assigned: number; submitted: number; onTime: number; late: number; missing: number }
  teacherFeedback: string[]
}

/**
 * Build the payload. Takes the roster names so any student's name typed into
 * feedback — not just this student's — gets scrubbed.
 */
export function deidentify(ev: CommentEvidence, rosterNames: string[]): DeidentifiedPacket {
  const names = [...new Set([ev.student.name, ...rosterNames])]
  const clean = (t: string) => scrubNames(t, names)

  return {
    subject: ev.curriculum?.subject ?? ev.course.name,
    gradeLevel: ev.curriculum?.grade ?? '',
    reporting: ev.reporting.kind === 'letter-grade' ? 'letter-grade-and-percentage' : 'proficiency-scale',
    ...(ev.reporting.kind === 'letter-grade'
      ? { standing: { letter: ev.reporting.result.letter, percent: ev.reporting.result.pct } }
      : {}),
    demonstrated: ev.strengths.map((s) => ({
      code: s.code,
      kind: s.kind,
      level: s.level,
      text: s.text,
      evidencedIn: s.source ? clean(s.source.title) : null,
    })),
    developing: ev.growing.map((s) => ({ code: s.code, kind: s.kind, level: s.level, text: s.text })),
    improvedOverTerm: ev.improved.map((g) => ({ code: g.code, from: g.from, to: g.to })),
    notAssessedCount: ev.notAssessed.length,
    workHabits: ev.workHabits,
    teacherFeedback: ev.teacherFeedback.map((f) => clean(f.feedback)),
  }
}
