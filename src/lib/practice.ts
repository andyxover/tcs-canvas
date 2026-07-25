/**
 * Targeted practice — what to work on next, and something to work on it with.
 *
 * The gap this fills: a student who is behind on a standard usually does not
 * know *which* standard, and has nothing to practise on that is aimed at it.
 * Textbook exercises are organised by chapter; the report card is organised by
 * subject; nothing is organised by "the specific thing you cannot do yet".
 * The LMS is the only place that knows, because it holds the per-standard
 * judgements.
 *
 * ONE HONEST ADMISSION SHAPES THIS FILE. For report comments and draft
 * feedback there is a real deterministic fallback, because both are
 * *reorganisations of evidence the school already holds*. Practice questions are
 * not — you cannot author a good question about "the law of conservation of
 * energy" by manipulating that string. So this module does not ship a fake
 * question generator and call it a fallback.
 *
 * Instead the two paths produce genuinely different artefacts, and are labelled
 * as such:
 *
 *   - The STUDY PLAN (always available, no model, nothing sent). What to work
 *     on, ranked, with the actual coursework in this course that assessed each
 *     one so the student can go back to it, and what the next level asks for.
 *     Real and useful on its own.
 *   - PRACTICE QUESTIONS (model only). Actual questions to work through.
 *
 * THE CENTRAL RISK is a confidently wrong answer key. A student practising alone
 * has nothing to check it against, so a wrong explanation is worse than no
 * practice at all. Three mitigations, all in the design rather than the prose:
 * every question carries its reasoning so an error is visible; nothing here
 * touches the gradebook or records a proficiency judgement; and the student can
 * flag a question straight to their teacher, which turns the failure mode into
 * a signal the teacher actually wants.
 */

import { courseStandardIds, getCourse, getPerson, listAssignments, studentMastery, getSubmission } from './store'
import {
  KIND_META,
  PROFICIENCY_LEVELS,
  PROFICIENCY_META,
  getStandard,
  type ProficiencyLevel,
  type StandardKind,
} from './bc-curriculum'

export type TargetReason = 'behind' | 'not-assessed'

export interface PracticeTarget {
  standardId: string
  code: string
  kind: string
  kindId: StandardKind
  text: string
  strand?: string
  currentLevel: ProficiencyLevel | null
  nextLevel: { level: ProficiencyLevel; label: string; description: string } | null
  /** Coursework in this course that assessed it — somewhere real to go back to. */
  evidencedIn: { assignmentId: string; title: string; level: ProficiencyLevel }[]
  reason: TargetReason
}

export interface PracticePlan {
  student: { id: string; name: string; firstName: string }
  course: { id: string; name: string; curriculum?: { subject: string; grade: string } }
  /** Ranked: furthest behind first, then never assessed. */
  targets: PracticeTarget[]
  /** Already solid. Shown too — a plan that only lists deficits is demoralising. */
  secure: { code: string; text: string; level: ProficiencyLevel }[]
}

/** Emerging and Developing are "behind"; Proficient and above are not. */
function isBehind(level: ProficiencyLevel): boolean {
  return level === 'emerging' || level === 'developing'
}

export async function gatherPracticePlan(courseId: string, studentId: string): Promise<PracticePlan | null> {
  const course = await getCourse(courseId)
  const person = await getPerson(studentId)
  if (!course || !person) return null

  const mastery = await studentMastery(courseId, studentId)
  const byStandard = new Map(mastery.map((m) => [m.standardId, m]))
  const assignments = await listAssignments(courseId)
  const publishedById = new Map(assignments.filter((a) => a.published).map((a) => [a.id, a]))

  const targets: PracticeTarget[] = []
  const secure: PracticePlan['secure'] = []

  for (const standardId of await courseStandardIds(courseId)) {
    const std = await getStandard(standardId)
    if (!std) continue
    const m = byStandard.get(standardId)
    const level = m?.latest ?? null

    if (level && !isBehind(level)) {
      secure.push({ code: std.code, text: std.text, level })
      continue
    }

    targets.push({
      standardId,
      code: std.code,
      kind: KIND_META[std.kind].label,
      kindId: std.kind,
      text: std.text,
      strand: std.strand,
      currentLevel: level,
      nextLevel: nextLevelUp(level),
      evidencedIn: (m?.history ?? [])
        .filter((h) => publishedById.has(h.assignmentId))
        .map((h) => ({ assignmentId: h.assignmentId, title: h.assignmentTitle, level: h.level })),
      reason: level ? 'behind' : 'not-assessed',
    })
  }

  // Furthest behind first. A standard never assessed goes last: it may be
  // perfectly secure and simply untested, so pushing a student to practise it
  // ahead of one they demonstrably struggled with would be wrong.
  const RANK: Record<TargetReason, number> = { behind: 0, 'not-assessed': 1 }
  targets.sort((a, b) => {
    if (RANK[a.reason] !== RANK[b.reason]) return RANK[a.reason] - RANK[b.reason]
    const al = a.currentLevel ? PROFICIENCY_LEVELS.indexOf(a.currentLevel) : 99
    const bl = b.currentLevel ? PROFICIENCY_LEVELS.indexOf(b.currentLevel) : 99
    return al - bl
  })

  return {
    student: { id: studentId, name: person.name, firstName: person.name.split(' ')[0] },
    course: { id: course.id, name: course.name, curriculum: course.curriculum },
    targets,
    secure,
  }
}

function nextLevelUp(
  current: ProficiencyLevel | null,
): { level: ProficiencyLevel; label: string; description: string } | null {
  const idx = current ? PROFICIENCY_LEVELS.indexOf(current) : -1
  const next = PROFICIENCY_LEVELS[idx + 1]
  if (!next) return null
  return { level: next, label: PROFICIENCY_META[next].label, description: PROFICIENCY_META[next].description }
}

// ---------------------------------------------------------------------------
// Practice questions
// ---------------------------------------------------------------------------

export interface PracticeQuestion {
  /** Stable within a set, so a flag can name which question it was about. */
  id: string
  standardCode: string
  prompt: string
  kind: 'mc' | 'short'
  /** Multiple choice only. */
  options?: string[]
  answerIndex?: number
  /** For short answer: what a good answer contains, not a script to copy. */
  lookFor?: string[]
  /** Why the answer is the answer — this is what makes an error visible. */
  explanation: string
  /** A nudge for someone stuck. Never the answer. */
  hint: string
}

export interface PracticeSet {
  standardCode: string
  questions: PracticeQuestion[]
  cautions: string[]
  generatorId: string
}

/**
 * Swap-in point. There is deliberately no in-repo default: writing questions is
 * the one thing here that cannot be faked deterministically, and a hand-rolled
 * template generator would produce the kind of hollow drill that teaches
 * students the tool is worthless.
 */
export interface PracticeGenerator {
  id: string
  label: string
  generate(target: PracticeTarget, plan: PracticePlan): Promise<PracticeSet>
}

/** What the student has already been asked in this course, so practice differs. */
export async function seenPrompts(courseId: string, studentId: string): Promise<string[]> {
  const out: string[] = []
  for (const a of await listAssignments(courseId)) {
    if (!a.published) continue
    const sub = await getSubmission(a.id, studentId)
    if (sub.state !== 'unsubmitted') out.push(a.title)
  }
  return out
}
