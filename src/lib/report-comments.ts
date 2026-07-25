import {
  KIND_META,
  PROFICIENCY_LEVELS,
  PROFICIENCY_META,
  getStandard,
  type ProficiencyLevel,
  type StandardKind,
} from './bc-curriculum'
import { isLate, isMissing } from './grade-calc'
import {
  courseGradeForStudent,
  getCourse,
  getPerson,
  getSubmission,
  listAssignments,
  studentMastery,
} from './store'
import type { CourseGrade } from './grade-calc'

/**
 * Report-card comments, grounded in evidence.
 *
 * Writing descriptive comments is the most time-expensive task in BC reporting,
 * and time pressure is exactly why they drift toward generic. The bottleneck is
 * not prose — a teacher can write. It is reassembling, per student per subject,
 * what the evidence actually was: which standards they've demonstrated, on which
 * pieces of work, and how that changed over the term.
 *
 * So this module's real product is the *evidence packet*. The drafting step sits
 * behind a swappable interface (see CommentDrafter) precisely because a draft is
 * only as good as the evidence handed to it — a better model cannot rescue a
 * packet that has nothing specific in it. Building the packet first also makes
 * the honest question answerable early: is the evidence trail rich enough that a
 * teacher would put their name under what comes out?
 *
 * Nothing here decides a grade. In BC the grade is the teacher's professional
 * judgement; this drafts prose from judgements the teacher already made.
 */

const RANK: Record<ProficiencyLevel, number> = {
  emerging: 0,
  developing: 1,
  proficient: 2,
  extending: 3,
}

export interface EvidenceItem {
  standardId: string
  code: string
  text: string
  kind: string
  /** Raw kind — the three BC kinds are grammatically different and need
      different sentence frames, so the draft switches on this. */
  kindId: StandardKind
  strand?: string
  level: ProficiencyLevel
  /** The piece of work that produced the most recent judgement. */
  source: { assignmentId: string; title: string } | null
}

export interface TrajectoryItem extends EvidenceItem {
  from: ProficiencyLevel
  to: ProficiencyLevel
}

export interface WorkHabits {
  assigned: number
  submitted: number
  onTime: number
  late: number
  missing: number
}

/**
 * BC reports differently either side of Grade 10. K–9 reports on the proficiency
 * scale alone; the Graduation Program (10–12) reports letter grades and
 * percentages, with the scale used formatively. Getting this wrong is not a
 * cosmetic error — it is the wrong kind of report card.
 */
export type ReportingMode =
  | { kind: 'proficiency'; grade: string }
  | { kind: 'letter-grade'; grade: string; result: CourseGrade }

export interface CommentEvidence {
  student: { id: string; name: string; firstName: string }
  course: { id: string; name: string; code: string; term: string }
  curriculum: { subject: string; grade: string } | null
  reporting: ReportingMode
  /** Standards at Proficient or Extending, strongest first. */
  strengths: EvidenceItem[]
  /** Standards at Emerging or Developing — where the next teaching goes. */
  growing: EvidenceItem[]
  /** Standards whose level rose over the term. The best comment material there is. */
  improved: TrajectoryItem[]
  /** Course standards with no judgement recorded at all. */
  notAssessed: { standardId: string; code: string; text: string }[]
  workHabits: WorkHabits
  /** Feedback the teacher actually wrote on this student's work, most recent first. */
  teacherFeedback: { assignmentTitle: string; feedback: string }[]
  /** True when there is too little evidence to write a defensible comment. */
  thin: boolean
}

function firstNameOf(name: string): string {
  return name.split(' ')[0]
}

/** Assemble everything known about one student in one course. */
export async function gatherEvidence(courseId: string, studentId: string): Promise<CommentEvidence | null> {
  const [course, student] = await Promise.all([getCourse(courseId), getPerson(studentId)])
  if (!course || !student) return null

  const mastery = await studentMastery(courseId, studentId)

  const resolved = await Promise.all(
    mastery.map(async (m) => ({ m, std: await getStandard(m.standardId) })),
  )

  const strengths: EvidenceItem[] = []
  const growing: EvidenceItem[] = []
  const improved: TrajectoryItem[] = []
  const notAssessed: CommentEvidence['notAssessed'] = []

  for (const { m, std } of resolved) {
    if (!std) continue
    if (m.latest == null) {
      notAssessed.push({ standardId: m.standardId, code: std.code, text: std.text })
      continue
    }
    const last = m.history[m.history.length - 1]
    const item: EvidenceItem = {
      standardId: m.standardId,
      code: std.code,
      text: std.text,
      kind: KIND_META[std.kind].label,
      kindId: std.kind,
      strand: std.strand,
      level: m.latest,
      source: last ? { assignmentId: last.assignmentId, title: last.assignmentTitle } : null,
    }
    if (RANK[m.latest] >= RANK.proficient) strengths.push(item)
    else growing.push(item)

    // Movement across the term — only counts if there are at least two judgements.
    if (m.history.length >= 2) {
      const first = m.history[0].level
      if (RANK[m.latest] > RANK[first]) improved.push({ ...item, from: first, to: m.latest })
    }
  }

  strengths.sort((a, b) => RANK[b.level] - RANK[a.level])
  growing.sort((a, b) => RANK[a.level] - RANK[b.level])

  // Work habits and the teacher's own words, from the actual submissions.
  const assignments = (await listAssignments(courseId)).filter((a) => a.published)
  const habits: WorkHabits = { assigned: assignments.length, submitted: 0, onTime: 0, late: 0, missing: 0 }
  const teacherFeedback: CommentEvidence['teacherFeedback'] = []

  for (const a of assignments) {
    const sub = await getSubmission(a.id, studentId)
    if (sub.state === 'unsubmitted') {
      if (isMissing(a, sub)) habits.missing += 1
      continue
    }
    habits.submitted += 1
    if (isLate(a, sub)) habits.late += 1
    else habits.onTime += 1
    if (sub.feedback?.trim()) teacherFeedback.push({ assignmentTitle: a.title, feedback: sub.feedback.trim() })
  }
  teacherFeedback.reverse()

  const gradeLevel = course.curriculum?.grade ?? ''
  const isGraduationProgram = /^1[0-2]$/.test(gradeLevel) || gradeLevel === '10-12'
  const reporting: ReportingMode = isGraduationProgram
    ? { kind: 'letter-grade', grade: gradeLevel, result: await courseGradeForStudent(courseId, studentId) }
    : { kind: 'proficiency', grade: gradeLevel }

  return {
    student: { id: student.id, name: student.name, firstName: firstNameOf(student.name) },
    course: { id: course.id, name: course.name, code: course.code, term: course.term },
    curriculum: course.curriculum ?? null,
    reporting,
    strengths,
    growing,
    improved,
    notAssessed,
    workHabits: habits,
    teacherFeedback,
    thin: strengths.length + growing.length < 2,
  }
}

// ---------------------------------------------------------------------------
// Drafting
// ---------------------------------------------------------------------------

export interface CommentDraft {
  /** The draft itself — always a starting point the teacher edits and owns. */
  body: string
  /** Which standards the draft actually leaned on, so the teacher can check it. */
  citedStandardIds: string[]
  /** Anything the teacher should know before trusting it. */
  cautions: string[]
  drafterId: string
}

/**
 * Swap-in point for a model.
 *
 * The default implementation below is deterministic — no model call, no API key,
 * no student work leaving the building. That is deliberately the shipped default:
 * an LLM drafter should be an explicit, reviewed decision, because it means
 * sending student evidence to a third party, and a BC offshore school has a real
 * answer to give about that. When that decision is made, implement this
 * interface and call setCommentDrafter(); nothing else in the app changes.
 */
export interface CommentDrafter {
  id: string
  label: string
  draft(evidence: CommentEvidence): Promise<CommentDraft>
}

function levelWord(l: ProficiencyLevel): string {
  return PROFICIENCY_META[l].label
}

/** Lower-case the opening letter and drop a trailing period so a standard can be
 *  spliced mid-sentence. */
function phrase(text: string): string {
  const t = text.trim().replace(/\.$/, '')
  return t.charAt(0).toLowerCase() + t.slice(1)
}

function joinList(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/**
 * BC's three kinds of learning standard are written in different grammar, and a
 * comment that ignores that produces nonsense — "Ava can the electron
 * arrangement of atoms impacts their chemical nature".
 *
 *   Curricular Competency — a verb phrase: "plan, select, and use appropriate
 *     investigation methods". Slots straight into "can …".
 *   Content — a noun phrase: "the atomic model and its use in …". Needs a verb
 *     supplied.
 *   Big Idea — a whole proposition: "The electron arrangement of atoms impacts
 *     their chemical nature." Needs framing as something explained.
 *
 * So each kind gets its own frame, for what the student can do and for what
 * comes next.
 */
function demonstrated(item: EvidenceItem): string {
  const p = phrase(item.text)
  switch (item.kindId) {
    case 'curricular-competency':
    case 'core-competency':
      return `can ${p}`
    case 'content':
      return `shows a secure grasp of ${p}`
    case 'big-idea':
      return `can explain how ${p}`
  }
}

function nextStep(item: EvidenceItem): string {
  const p = phrase(item.text)
  switch (item.kindId) {
    case 'curricular-competency':
    case 'core-competency':
      return `more practice to ${p}`
    case 'content':
      return `consolidating ${p}`
    case 'big-idea':
      return `building a fuller picture of how ${p}`
  }
}

/** Where the evidence came from, if we can name it. */
function citing(item: EvidenceItem): string {
  return item.source ? ` (${item.code}, in ${item.source.title})` : ` (${item.code})`
}

/**
 * A BC-shaped comment: what the student can do, how they moved, where the next
 * teaching goes — the three moves a descriptive comment is expected to make.
 *
 * Two deliberate restraints. It never claims an overall course proficiency from
 * a handful of standards, because "Ava is working at an Extending level" reads
 * as a whole-course judgement when the evidence covers two standards out of
 * eleven; it states the count instead. And every claim carries the standard code
 * and the work that evidenced it, because a comment a parent can trace is worth
 * more than a fluent one they cannot.
 */
export const structuredDrafter: CommentDrafter = {
  id: 'structured',
  label: 'Structured draft (on-device)',
  async draft(ev) {
    const { firstName } = ev.student
    const cautions: string[] = []
    const cited: string[] = []
    const parts: string[] = []

    if (ev.thin) {
      cautions.push(
        'Very little assessed evidence for this student — the draft below is deliberately thin rather than confidently wrong.',
      )
    }
    if (ev.notAssessed.length > 0) {
      cautions.push(
        `${ev.notAssessed.length} of the course's standards have no recorded judgement for ${firstName}, so the comment cannot speak to them.`,
      )
    }

    const assessed = ev.strengths.length + ev.growing.length

    // 1. What the student can do — counted honestly, then made specific.
    if (ev.strengths.length > 0) {
      const top = ev.strengths.slice(0, 2)
      top.forEach((s) => cited.push(s.standardId))
      // Naming a single level is only honest when every counted standard reached
      // it; otherwise "Proficient or above" is accurate by construction, since
      // that is exactly the set `strengths` holds. Checking first means a student
      // sitting at Extending across the board is not reported at the floor.
      const shared = ev.strengths.every((s) => s.level === ev.strengths[0].level)
        ? levelWord(ev.strengths[0].level)
        : 'Proficient or above'
      parts.push(
        `In ${ev.course.name}, ${firstName} is working at ${shared} on ` +
          `${ev.strengths.length} of the ${assessed} learning standards assessed this term.`,
      )
      parts.push(`${firstName} ${joinList(top.map((s) => demonstrated(s) + citing(s)))}.`)
    } else if (assessed > 0) {
      parts.push(`In ${ev.course.name}, ${firstName} is building the foundations of the course standards.`)
    } else {
      parts.push(`No assessed work is recorded for ${firstName} in ${ev.course.name} this term.`)
    }

    // 2. Movement — what a term report is actually for.
    if (ev.improved.length > 0) {
      const g = ev.improved[0]
      cited.push(g.standardId)
      parts.push(
        `Growth is visible over the term: work on ${g.code} moved from ` +
          `${levelWord(g.from)} to ${levelWord(g.to)}` +
          `${g.source ? `, most recently in ${g.source.title}` : ''}.`,
      )
    }

    // 3. Where the next teaching goes.
    if (ev.growing.length > 0) {
      // `growing` is sorted furthest-behind first, so the named ones are the
      // most urgent. Capping keeps the sentence readable — but the remainder is
      // stated rather than dropped, because a comment that silently names two of
      // five growth areas reads as though there were only two.
      const focus = ev.growing.slice(0, 2)
      const rest = ev.growing.length - focus.length
      focus.forEach((s) => cited.push(s.standardId))
      // Code only, no source: naming where it was last assessed reads as though
      // that is where the next step happens.
      parts.push(
        `Next steps: ${joinList(focus.map((s) => `${nextStep(s)} (${s.code})`))}` +
          `${rest > 0 ? `, with ${rest} further standard${rest === 1 ? '' : 's'} still developing` : ''}.`,
      )
    }

    // 4. Work habits, only when there is something worth saying.
    const h = ev.workHabits
    if (h.missing > 0) {
      parts.push(
        `${h.missing} of ${h.assigned} assignments ${h.missing === 1 ? 'is' : 'are'} outstanding; ` +
          `completing ${h.missing === 1 ? 'it' : 'them'} would give a fuller picture of what ${firstName} can do.`,
      )
    } else if (h.late > 0 && h.submitted > 0) {
      parts.push(`${firstName} submitted ${h.submitted} of ${h.assigned} assignments, ${h.late} after the due date.`)
    } else if (h.submitted === h.assigned && h.assigned > 0) {
      parts.push(`${firstName} completed all assigned work on time.`)
    }

    // 5. The reported result, in the form BC expects for this grade band.
    if (ev.reporting.kind === 'letter-grade') {
      const { result } = ev.reporting
      if (result.pct != null && result.letter) {
        parts.push(`Current standing: ${result.letter} (${result.pct}%).`)
      } else {
        cautions.push('No percentage could be calculated yet — not enough graded work.')
      }
    }

    return {
      body: parts.join(' '),
      citedStandardIds: [...new Set(cited)],
      cautions,
      drafterId: this.id,
    }
  },
}

let drafter: CommentDrafter = structuredDrafter

export function setCommentDrafter(next: CommentDrafter): void {
  drafter = next
}

export function activeDrafter(): { id: string; label: string } {
  return { id: drafter.id, label: drafter.label }
}

export async function draftComment(evidence: CommentEvidence): Promise<CommentDraft> {
  return drafter.draft(evidence)
}

/** Proficiency counts for the whole class, for the teacher's overview. */
export function levelTally(items: EvidenceItem[]): { level: ProficiencyLevel; n: number }[] {
  return PROFICIENCY_LEVELS.map((level) => ({ level, n: items.filter((i) => i.level === level).length }))
}
