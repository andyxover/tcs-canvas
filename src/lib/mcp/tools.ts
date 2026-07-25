/**
 * The LMS as something an assistant can query.
 *
 * The bet behind this file: rather than building every AI feature into the LMS,
 * expose what the LMS knows and let teachers use whatever assistant they already
 * have. It ages better than any individual feature, because the models keep
 * improving and the evidence stays the valuable part.
 *
 * What makes it worth exposing is the same thing that made the other features
 * possible — a longitudinal, standards-aligned record of what each student can
 * actually do. "Which of my Chemistry 11 students haven't demonstrated CC-3 yet?"
 * is unanswerable by any general assistant, and trivial here.
 *
 * TWO RULES SHAPE THE TOOL LIST.
 *
 * 1. Every tool is scoped to the calling teacher and re-checks it. The caller
 *    supplies a course id; ownership is never inferred from the fact they knew
 *    the id. `assertMine` is the only way to a course.
 *
 * 2. It reads, and it drafts. It does not judge. No tool here sets a score,
 *    records a proficiency judgement, writes a report comment, or publishes
 *    anything to students. That line has been held three times already in this
 *    build, and an API endpoint is precisely where it would quietly get crossed
 *    — an agent that can mark work will eventually mark work.
 */

import {
  createAssignment,
  getCourse,
  listAssignments,
  listCoursesForTeacher,
  listRoster,
  listSubmissionsForAssignment,
  studentMastery,
  teacherGradingQueue,
  courseStandardIds,
  getSubmission,
} from '../store'
import { getStandard, PROFICIENCY_META, type ProficiencyLevel } from '../bc-curriculum'
import { isLate, isMissing } from '../grade-calc'

/** Emerging and Developing are "not yet demonstrated"; Proficient and up are. */
function demonstrated(level: ProficiencyLevel | null): boolean {
  return level === 'proficient' || level === 'extending'
}

class ToolError extends Error {}

/**
 * The only door to a course.
 *
 * Knowing a course id is not authorisation to read it — ids are short, guessable
 * and appear in URLs. Every tool goes through here.
 */
async function assertMine(teacherId: string, courseId: string) {
  const course = await getCourse(courseId)
  if (!course || course.teacherId !== teacherId) {
    // Same message either way: distinguishing "no such course" from "not yours"
    // would turn this into an oracle for which course ids exist.
    throw new ToolError(`No course "${courseId}" that you teach.`)
  }
  return course
}

/** Resolve a human-typed standard code ("SCI9-CC-3") to its id. */
async function findStandard(courseId: string, code: string) {
  const wanted = code.trim().toUpperCase()
  for (const id of await courseStandardIds(courseId)) {
    const std = await getStandard(id)
    if (std && std.code.toUpperCase() === wanted) return std
  }
  throw new ToolError(`No standard "${code}" is attached to any work in this course.`)
}

export async function listMyCourses(teacherId: string) {
  const courses = await listCoursesForTeacher(teacherId)
  return {
    courses: await Promise.all(
      courses.map(async (c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        term: c.term,
        curriculum: c.curriculum ?? null,
        students: (await listRoster(c.id)).length,
      })),
    ),
  }
}

export async function listCourseRoster(teacherId: string, courseId: string) {
  await assertMine(teacherId, courseId)
  return { students: (await listRoster(courseId)).map((p) => ({ id: p.id, name: p.name })) }
}

export async function listCourseStandards(teacherId: string, courseId: string) {
  await assertMine(teacherId, courseId)
  const out = []
  for (const id of await courseStandardIds(courseId)) {
    const std = await getStandard(id)
    if (std) out.push({ code: std.code, kind: std.kind, text: std.text, strand: std.strand ?? null })
  }
  return { standards: out }
}

/**
 * The headline query — and the argument for this whole file.
 *
 * Answers "who hasn't shown me this yet", which is the question a teacher
 * actually asks before planning next week, and which no assistant without our
 * tables can answer. Splits three ways rather than two, because "assessed and
 * still developing" and "never assessed at all" call for completely different
 * responses and collapsing them would send a teacher after the wrong students.
 */
export async function whoHasNotDemonstrated(teacherId: string, courseId: string, standardCode: string) {
  await assertMine(teacherId, courseId)
  const std = await findStandard(courseId, standardCode)

  const notYet: { id: string; name: string; level: string; lastSeenIn: string | null }[] = []
  const neverAssessed: { id: string; name: string }[] = []
  const demonstratedBy: { id: string; name: string; level: string }[] = []

  for (const student of await listRoster(courseId)) {
    const m = (await studentMastery(courseId, student.id)).find((x) => x.standardId === std.id)
    const level = m?.latest ?? null
    if (!level) {
      neverAssessed.push({ id: student.id, name: student.name })
    } else if (demonstrated(level)) {
      demonstratedBy.push({ id: student.id, name: student.name, level: PROFICIENCY_META[level].label })
    } else {
      const last = m?.history[m.history.length - 1]
      notYet.push({
        id: student.id,
        name: student.name,
        level: PROFICIENCY_META[level].label,
        lastSeenIn: last?.assignmentTitle ?? null,
      })
    }
  }

  return {
    standard: { code: std.code, text: std.text },
    assessedButNotYetProficient: notYet,
    neverAssessed,
    demonstrated: demonstratedBy,
    note: 'A student under "neverAssessed" is not behind — no work has measured this for them yet.',
  }
}

export async function studentStanding(teacherId: string, courseId: string, studentId: string) {
  await assertMine(teacherId, courseId)
  const roster = await listRoster(courseId)
  const student = roster.find((p) => p.id === studentId)
  if (!student) throw new ToolError('That student is not on this course roster.')

  const canDo: { code: string; level: string; shownIn: string | null }[] = []
  const working: { code: string; level: string }[] = []
  let notAssessed = 0
  for (const m of await studentMastery(courseId, studentId)) {
    const std = await getStandard(m.standardId)
    if (!std) continue
    if (!m.latest) {
      notAssessed += 1
      continue
    }
    const last = m.history[m.history.length - 1]
    if (demonstrated(m.latest)) {
      canDo.push({ code: std.code, level: PROFICIENCY_META[m.latest].label, shownIn: last?.assignmentTitle ?? null })
    } else {
      working.push({ code: std.code, level: PROFICIENCY_META[m.latest].label })
    }
  }

  const assignments = (await listAssignments(courseId)).filter((a) => a.published)
  let submitted = 0
  let late = 0
  const missing: string[] = []
  for (const a of assignments) {
    const sub = await getSubmission(a.id, studentId)
    if (sub.state !== 'unsubmitted') submitted += 1
    if (isLate(a, sub)) late += 1
    if (isMissing(a, sub)) missing.push(a.title)
  }

  return {
    student: { id: student.id, name: student.name },
    demonstrated: canDo,
    stillWorkingOn: working,
    notAssessedCount: notAssessed,
    work: { assigned: assignments.length, submitted, late, missing },
  }
}

export async function gradingQueue(teacherId: string) {
  const { entries, total } = await teacherGradingQueue(teacherId)
  return {
    total,
    // The store aggregates per course, not per assignment — reporting a
    // per-assignment breakdown here would mean inventing one.
    waiting: entries
      .filter((e) => e.toGrade > 0)
      .map((e) => ({ courseId: e.courseId, course: e.courseName, toGrade: e.toGrade })),
  }
}

export async function missingWork(teacherId: string, courseId: string) {
  await assertMine(teacherId, courseId)
  const roster = await listRoster(courseId)
  const byStudent = new Map<string, string[]>()

  for (const a of (await listAssignments(courseId)).filter((x) => x.published)) {
    const subs = await listSubmissionsForAssignment(a.id)
    for (const student of roster) {
      const sub = subs.find((s) => s.studentId === student.id)
      if (sub && isMissing(a, sub)) {
        byStudent.set(student.id, [...(byStudent.get(student.id) ?? []), a.title])
      }
    }
  }

  return {
    students: roster
      .filter((s) => byStudent.has(s.id))
      .map((s) => ({ id: s.id, name: s.name, missing: byStudent.get(s.id)! })),
  }
}

/**
 * The only write, and it writes a draft.
 *
 * `published: false` is not a default a caller can override — there is no
 * parameter for it. An assistant can prepare next week's lab aligned to a
 * standard, which is real work saved; a teacher still reads it and presses
 * publish, which is where the professional judgement stays.
 */
export async function draftAssignment(
  teacherId: string,
  input: {
    courseId: string
    title: string
    instructions: string
    points: number
    category?: string
    dueAt?: string
    standardCodes?: string[]
  },
) {
  const course = await assertMine(teacherId, input.courseId)

  const standardIds: string[] = []
  for (const code of input.standardCodes ?? []) {
    standardIds.push((await findStandard(input.courseId, code)).id)
  }

  const category = input.category ?? course.gradeSettings.categories[0]?.name ?? 'Assignments'
  const known = course.gradeSettings.categories.map((c) => c.name)
  if (known.length > 0 && !known.includes(category)) {
    throw new ToolError(`Category must be one of: ${known.join(', ')}.`)
  }

  let dueAt: string | null = null
  if (input.dueAt) {
    const t = Date.parse(input.dueAt)
    if (Number.isNaN(t)) throw new ToolError('dueAt must be an ISO date, e.g. 2026-03-14T23:59:00Z.')
    dueAt = new Date(t).toISOString()
  }

  const created = await createAssignment({
    courseId: input.courseId,
    title: input.title,
    // Plain text arrives from an assistant; the field renders HTML, so wrap it
    // rather than trusting it to be markup.
    instructions: `<p>${escapeHtml(input.instructions)}</p>`,
    points: Math.max(0, Math.min(1000, Math.round(input.points))),
    category,
    dueAt,
    published: false,
    rubricId: null,
    standardIds,
  })

  return {
    created: { id: created.id, title: created.title, published: false },
    note: 'Created as an unpublished draft. Students cannot see it until a teacher publishes it.',
    reviewAt: `/lms/courses/${input.courseId}/assignments/${created.id}`,
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export { ToolError }
