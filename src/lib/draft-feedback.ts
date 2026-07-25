/**
 * Formative feedback on a draft, before it is handed in.
 *
 * The pedagogy this is built around: feedback only changes anything if it
 * arrives while the student can still act on it. A grade at the end of the term
 * is a verdict; a comment on a draft on Tuesday is teaching. Teachers know this
 * perfectly well — what stops them is that giving specific, standards-aligned
 * feedback to thirty drafts is not a thing a human has time for.
 *
 * As with report comments, the product here is the CONTEXT PACKET, not the
 * prose. What makes feedback useful is knowing which standards this task is
 * actually assessed against, where this particular student currently sits on
 * each, and what the next level up asks for. Assemble that and even a
 * deterministic checklist is worth reading; fail to assemble it and no model
 * will rescue you — it will produce fluent, generic writing-centre advice.
 *
 * Two hard limits are enforced everywhere below, in the structured coach and in
 * the prompt for the model one:
 *
 *   1. NO GRADE. Not a score, not a percentage, not a proficiency level. The
 *      moment this predicts a grade it stops being formative and becomes an
 *      unofficial assessment the student will treat as the real one — and it has
 *      no standing to make that judgement. Only the teacher assesses.
 *   2. NO DOING THE WORK. It never supplies sentences, answers, examples to
 *      paste, or rewrites. It points at gaps and asks questions. Without this
 *      rule an assignment coach is just a cheating machine with a school logo.
 */

import { getAssignment, getCourse, getPerson, getRubric, getSubmission, listAssignments, studentMastery } from './store'
import {
  KIND_META,
  PROFICIENCY_LEVELS,
  PROFICIENCY_META,
  getStandard,
  type ProficiencyLevel,
  type StandardKind,
} from './bc-curriculum'

/** One standard this task is assessed against, plus where this student stands. */
export interface CoachStandard {
  standardId: string
  code: string
  /** Display label for the kind — "Curricular Competency". */
  kind: string
  /** Raw kind: the three BC kinds are written in different grammar. */
  kindId: StandardKind
  text: string
  strand?: string
  /** The student's most recent recorded level, or null if never assessed. */
  currentLevel: ProficiencyLevel | null
  /** What the next level up asks for. Null once at Extending. */
  nextLevel: { level: ProficiencyLevel; label: string; description: string } | null
  /**
   * Whether the draft appears to touch this standard at all.
   *
   * Keyword overlap, nothing cleverer — it cannot tell whether the student
   * understood anything, only whether the words are present. Surfaced as a
   * prompt to check, never as a judgement, and labelled that way in the UI.
   */
  mentioned: boolean
}

export interface CoachRubricCriterion {
  name: string
  levels: { label: string; points: number; description: string }[]
}

export interface DraftContext {
  student: { id: string; name: string; firstName: string }
  course: { id: string; name: string; curriculum?: { subject: string; grade: string } }
  assignment: {
    id: string
    title: string
    /** Instructions as plain text — the stored form is teacher-authored HTML. */
    task: string
    points: number
    dueAt: string | null
  }
  standards: CoachStandard[]
  rubric: CoachRubricCriterion[] | null
  draft: { text: string; words: number }
  /** The teacher's own words on this student's earlier work, for continuity. */
  priorFeedback: { assignmentTitle: string; feedback: string }[]
  /** Too little to say anything real about yet. */
  thin: boolean
}

const THIN_WORDS = 25

/**
 * @param liveDraft The text currently in the student's editor, if they have not
 *   turned in since typing it. The stored submission only updates on turn-in,
 *   so without this the whole feature coaches an empty draft — which is exactly
 *   the moment a student most wants feedback. It is the student's own writing
 *   about their own work, so there is nothing to trust here beyond a length cap.
 */
export async function gatherDraftContext(
  assignmentId: string,
  studentId: string,
  liveDraft?: string,
): Promise<DraftContext | null> {
  const assignment = await getAssignment(assignmentId)
  if (!assignment) return null
  const course = await getCourse(assignment.courseId)
  const person = await getPerson(studentId)
  if (!course || !person) return null

  const sub = await getSubmission(assignmentId, studentId)
  const text = (liveDraft ?? sub.text ?? '').trim()
  const words = text ? text.split(/\s+/).length : 0

  const mastery = await studentMastery(course.id, studentId)
  const levelOf = new Map(mastery.map((m) => [m.standardId, m.latest]))

  const standards: CoachStandard[] = []
  for (const id of assignment.standardIds) {
    const std = await getStandard(id)
    if (!std) continue
    const currentLevel = levelOf.get(id) ?? null
    standards.push({
      standardId: id,
      code: std.code,
      kind: KIND_META[std.kind].label,
      kindId: std.kind,
      text: std.text,
      strand: std.strand,
      currentLevel,
      nextLevel: nextLevelUp(currentLevel),
      mentioned: mentions(text, std.text),
    })
  }

  const rubricRow = assignment.rubricId ? await getRubric(assignment.rubricId) : undefined
  const rubric = rubricRow
    ? rubricRow.criteria.map((c) => ({
        name: c.name,
        levels: c.levels.map((l) => ({ label: l.label, points: l.points, description: l.description })),
      }))
    : null

  // The teacher's own voice on earlier work. Feedback that contradicts what the
  // teacher already said is worse than no feedback, so it goes in the packet.
  const priorFeedback: DraftContext['priorFeedback'] = []
  for (const a of await listAssignments(course.id)) {
    if (a.id === assignmentId) continue
    const s = await getSubmission(a.id, studentId)
    if (s.feedback?.trim()) priorFeedback.push({ assignmentTitle: a.title, feedback: s.feedback.trim() })
  }

  return {
    student: { id: studentId, name: person.name, firstName: person.name.split(' ')[0] },
    course: { id: course.id, name: course.name, curriculum: course.curriculum },
    assignment: {
      id: assignment.id,
      title: assignment.title,
      task: toPlainText(assignment.instructions),
      points: assignment.points,
      dueAt: assignment.dueAt,
    },
    standards,
    rubric,
    draft: { text, words },
    priorFeedback: priorFeedback.slice(-3),
    thin: words < THIN_WORDS,
  }
}

/** The rung above where the student currently sits. Null once at the top. */
function nextLevelUp(
  current: ProficiencyLevel | null,
): { level: ProficiencyLevel; label: string; description: string } | null {
  // Never assessed on this standard: the first rung is the target.
  const idx = current ? PROFICIENCY_LEVELS.indexOf(current) : -1
  const next = PROFICIENCY_LEVELS[idx + 1]
  if (!next) return null
  return { level: next, label: PROFICIENCY_META[next].label, description: PROFICIENCY_META[next].description }
}

const STOPWORDS = new Set([
  'about', 'above', 'after', 'their', 'there', 'these', 'those', 'which', 'while', 'would', 'could',
  'should', 'other', 'using', 'used', 'including', 'appropriate', 'individually', 'collaboratively',
  'between', 'through', 'within', 'across', 'various', 'different', 'understanding', 'develop',
])

/**
 * Does the draft appear to touch this standard?
 *
 * Content-word overlap. This is deliberately crude and is never reported as a
 * verdict — a student can address a standard perfectly without reusing its
 * vocabulary, and can parrot the vocabulary without addressing it. It earns its
 * place only as "worth checking", which is genuinely useful on a long task list.
 */
function mentions(draft: string, standardText: string): boolean {
  if (!draft) return false
  const hay = draft.toLowerCase()
  const terms = standardText
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 4 && !STOPWORDS.has(w))
  if (terms.length === 0) return false
  return terms.some((t) => hay.includes(t))
}

/** Teacher-authored HTML → the text a model (or a checklist) should reason over. */
function toPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ---------------------------------------------------------------------------
// Coaching
// ---------------------------------------------------------------------------

export interface CoachNote {
  /** The standard this note is about, when it is about one. */
  code?: string
  text: string
}

export interface DraftFeedback {
  /** What the draft already does. Never a level, never a score. */
  working: CoachNote[]
  /** What would move it forward — gaps and questions, never supplied content. */
  nextMoves: CoachNote[]
  /** Assessed standards the draft does not appear to reach yet. */
  notYetVisible: { code: string; text: string }[]
  /** What the reader should know before trusting any of it. */
  cautions: string[]
  coachId: string
}

/**
 * Swap-in point, mirroring CommentDrafter.
 *
 * The default below never calls anything. That matters more here than it does
 * for report comments: this packet contains the student's own draft in full,
 * which is a real escalation over a list of standard codes and levels. Sending
 * it anywhere should be a decision someone made on purpose.
 */
export interface FeedbackCoach {
  id: string
  label: string
  coach(ctx: DraftContext): Promise<DraftFeedback>
}

/**
 * The honest baseline.
 *
 * It cannot read the draft for meaning and does not pretend to. What it can do
 * is turn the assignment's own standards into a checklist aimed at THIS student
 * — naming where they currently sit and what the next rung actually asks for —
 * which is information the student otherwise never sees. That is a real
 * artefact, not a placeholder, and it is the thing a model draft has to beat.
 */
export const structuredCoach: FeedbackCoach = {
  id: 'structured',
  label: 'Standards checklist (on-device)',
  async coach(ctx) {
    const working: CoachNote[] = []
    const nextMoves: CoachNote[] = []
    const cautions: string[] = [
      'Built from this task’s learning standards, not from reading your draft. It cannot tell whether an idea is correct — your teacher assesses that.',
    ]

    if (ctx.thin) {
      cautions.push(
        ctx.draft.words === 0
          ? 'Nothing is written yet, so this is the checklist for the task rather than feedback on your work.'
          : 'There is very little written so far, so this is mostly the checklist for the task.',
      )
    }

    // Zero matches on a draft of real length says more about the matcher than
    // about the student: standards are written in curriculum register, and a
    // good answer routinely addresses one without reusing a single one of its
    // words. Listing every standard as "not showing up" would then tell a
    // student who wrote well that none of it counted. Withhold the claim
    // instead — a checklist that admits it cannot tell beats a confident wrong
    // verdict on someone's work.
    const anyMatch = ctx.standards.some((s) => s.mentioned)
    const matcherUseless = !anyMatch && !ctx.thin
    if (matcherUseless) {
      cautions.push(
        'None of this task’s standards matched by wording, which often just means you wrote it in your own words. Read the list below against your draft yourself.',
      )
    }

    for (const s of ctx.standards) {
      if (s.mentioned) {
        working.push({ code: s.code, text: `Your draft touches on ${phraseOf(s.text)} (${s.code}).` })
      }
      if (s.nextLevel) {
        const where = s.currentLevel
          ? `You are currently recorded at ${PROFICIENCY_META[s.currentLevel].label} here`
          : 'This has not been assessed for you yet'
        nextMoves.push({
          code: s.code,
          text: `${capitalize(phraseOf(s.text))}. ${where}; ${PROFICIENCY_META[s.nextLevel.level].label} means ${lower(s.nextLevel.description)}`,
        })
      }
    }

    if (ctx.rubric) {
      for (const c of ctx.rubric) {
        const top = c.levels.reduce((a, b) => (b.points > a.points ? b : a), c.levels[0])
        if (top) nextMoves.push({ text: `${c.name} — the strongest level on the rubric describes: ${top.description}` })
      }
    }

    return {
      working,
      nextMoves,
      // Suppressed entirely when the word match found nothing anywhere — see above.
      notYetVisible: matcherUseless
        ? []
        : ctx.standards.filter((s) => !s.mentioned).map((s) => ({ code: s.code, text: s.text })),
      cautions,
      coachId: 'structured',
    }
  },
}

let coach: FeedbackCoach = structuredCoach

export function setFeedbackCoach(next: FeedbackCoach): void {
  coach = next
}

export function activeCoach(): { id: string; label: string } {
  return { id: coach.id, label: coach.label }
}

export async function coachDraft(ctx: DraftContext): Promise<DraftFeedback> {
  return coach.coach(ctx)
}

function phraseOf(text: string): string {
  const t = text.trim().replace(/\.$/, '')
  return t.charAt(0).toLowerCase() + t.slice(1)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1)
}
