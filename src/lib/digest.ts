/**
 * What a family actually hears about their child.
 *
 * The thing an offshore school's parents currently get is a percentage, and a
 * percentage is close to information-free: "78%" tells you your child is
 * somewhere in the middle of something, in a subject you may not have studied,
 * in a language you may not read. Families paying offshore fees notice this, and
 * what they ask for — more contact, more detail — is usually a proxy for "tell
 * me something I can act on".
 *
 * We can, because we hold per-standard judgements and the coursework that
 * produced them. So the digest leads with what the child can now do, names the
 * work that showed it, says what is being worked on next, and is honest about
 * what has not been looked at. The mark is present but demoted — it is the least
 * informative thing here, and putting it at the top would restore exactly the
 * conversation this is trying to replace.
 *
 * Two boundaries:
 *   - A digest reports judgements the teacher already made. It never makes one,
 *     never predicts a grade, and never characterises a child's ability,
 *     attitude or potential.
 *   - Nothing reaches a family that the teacher cannot see. A machine summary
 *     that mischaracterises a child, with no teacher ever seeing it, is the
 *     failure worth designing against.
 */

import {
  courseGradeForStudent,
  courseStandardIds,
  getCourse,
  getPerson,
  getSubmission,
  listAssignments,
  studentMastery,
} from './store'
import { PROFICIENCY_META, getStandard, type ProficiencyLevel } from './bc-curriculum'
import { isLate, isMissing } from './grade-calc'

export interface DigestStandard {
  code: string
  text: string
  level: ProficiencyLevel
  /** The piece of work that showed it — what makes this checkable. */
  evidencedIn: string | null
}

export interface CourseDigest {
  courseId: string
  courseName: string
  /** Present, but never the headline. Null for K-9 proficiency reporting. */
  standing: { letter: string | null; percent: number | null } | null
  canNowDo: DigestStandard[]
  workingOn: DigestStandard[]
  notAssessedCount: number
  work: { assigned: number; submitted: number; late: number; missing: number }
  /** Named, so "one is outstanding" is actionable rather than a mystery. */
  outstanding: { title: string; dueAt: string | null }[]
  comingUp: { title: string; dueAt: string | null }[]
  teacherFeedback: { assignmentTitle: string; feedback: string }[]
}

export interface FamilyDigest {
  student: { id: string; name: string; firstName: string }
  guardian: { name: string; relation: string; language: string }
  courses: CourseDigest[]
  /** True when there is too little assessed to say anything worth reading. */
  thin: boolean
}

const RANK: Record<ProficiencyLevel, number> = { emerging: 0, developing: 1, proficient: 2, extending: 3 }
/** Two weeks ahead: far enough to plan around, near enough to still matter. */
const HORIZON_DAYS = 14

export async function gatherFamilyDigest(
  studentId: string,
  guardian: { name: string; relation: string; language: string },
  courseIds: string[],
): Promise<FamilyDigest | null> {
  const person = await getPerson(studentId)
  if (!person) return null

  const courses: CourseDigest[] = []
  for (const courseId of courseIds) {
    const course = await getCourse(courseId)
    if (!course) continue

    const mastery = await studentMastery(courseId, studentId)
    const canNowDo: DigestStandard[] = []
    const workingOn: DigestStandard[] = []
    let notAssessedCount = 0

    for (const m of mastery) {
      const std = await getStandard(m.standardId)
      if (!std) continue
      if (!m.latest) {
        notAssessedCount += 1
        continue
      }
      const last = m.history[m.history.length - 1]
      const entry: DigestStandard = {
        code: std.code,
        text: std.text,
        level: m.latest,
        evidencedIn: last?.assignmentTitle ?? null,
      }
      if (RANK[m.latest] >= RANK.proficient) canNowDo.push(entry)
      else workingOn.push(entry)
    }
    // Strongest first in what they can do; furthest behind first in what is next.
    canNowDo.sort((a, b) => RANK[b.level] - RANK[a.level])
    workingOn.sort((a, b) => RANK[a.level] - RANK[b.level])

    const assignments = (await listAssignments(courseId)).filter((a) => a.published)
    const now = Date.now()
    const horizon = now + HORIZON_DAYS * 24 * 60 * 60 * 1000

    let submitted = 0
    let late = 0
    const outstanding: CourseDigest['outstanding'] = []
    const comingUp: CourseDigest['comingUp'] = []
    const teacherFeedback: CourseDigest['teacherFeedback'] = []

    for (const a of assignments) {
      const sub = await getSubmission(a.id, studentId)
      if (sub.state !== 'unsubmitted') submitted += 1
      if (isLate(a, sub)) late += 1
      if (isMissing(a, sub)) outstanding.push({ title: a.title, dueAt: a.dueAt })
      const due = a.dueAt ? Date.parse(a.dueAt) : NaN
      if (!Number.isNaN(due) && due >= now && due <= horizon) comingUp.push({ title: a.title, dueAt: a.dueAt })
      if (sub.feedback?.trim()) teacherFeedback.push({ assignmentTitle: a.title, feedback: sub.feedback.trim() })
    }

    // Only for the Graduation Program. K-9 reports on the proficiency scale
    // alone, and inventing a percentage for a Grade 9 family would misrepresent
    // how BC actually reports.
    const grade = course.curriculum?.grade ?? ''
    const isGraduationProgram = /^1[0-2]$/.test(grade) || grade === '10-12'
    let standing: CourseDigest['standing'] = null
    if (isGraduationProgram) {
      const result = await courseGradeForStudent(courseId, studentId)
      standing = { letter: result.letter ?? null, percent: result.pct ?? null }
    }

    courses.push({
      courseId,
      courseName: course.name,
      standing,
      canNowDo,
      workingOn,
      notAssessedCount,
      work: { assigned: assignments.length, submitted, late, missing: outstanding.length },
      outstanding,
      comingUp: comingUp.slice(0, 4),
      // The teacher's own words carry more weight with a family than anything
      // assembled here, so the most recent survive into the digest.
      teacherFeedback: teacherFeedback.slice(-2),
      })
  }

  const assessed = courses.reduce((n, c) => n + c.canNowDo.length + c.workingOn.length, 0)
  return {
    student: { id: studentId, name: person.name, firstName: person.name.split(' ')[0] },
    guardian,
    courses,
    thin: assessed < 2,
  }
}

/** Standards this course covers that nobody has judged yet, for honesty. */
export async function unassessedCount(courseId: string, studentId: string): Promise<number> {
  const ids = await courseStandardIds(courseId)
  const mastery = await studentMastery(courseId, studentId)
  const judged = new Set(mastery.filter((m) => m.latest).map((m) => m.standardId))
  return ids.filter((id) => !judged.has(id)).length
}

export function levelWord(l: ProficiencyLevel): string {
  return PROFICIENCY_META[l].label
}
