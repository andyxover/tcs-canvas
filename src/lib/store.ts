// In-memory data store for the LMS sandbox. A single mutable world lives on
// globalThis so it survives dev hot-reloads (and resets on a full server
// restart — exactly what you want for a demo playground). No database, no RLS.
//
// When the sandbox graduates, this module is the seam to replace: swap these
// functions for real Supabase reads/writes and the UI keeps working unchanged.

import { buildSeed } from './seed'
import { computeCourseGrade, type CourseGrade, type ScoredItem } from './grade-calc'
import { listStandards, type ProficiencyLevel } from './bc-curriculum'
import type {
  Announcement,
  Assignment,
  Course,
  CourseModule,
  DiscussionPost,
  DiscussionTopic,
  DraftCoachRequest,
  GradeSettings,
  LmsData,
  ModuleItem,
  Page,
  Person,
  Quiz,
  QuizQuestion,
  ReportComment,
  Rubric,
  RubricScore,
  StandardAssessment,
  Submission,
} from './types'

const globalRef = globalThis as unknown as { __lmsLabData?: LmsData }

async function data(): Promise<LmsData> {
  if (!globalRef.__lmsLabData) globalRef.__lmsLabData = buildSeed()
  return globalRef.__lmsLabData
}

let idCounter = 0
function newId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export async function listTeachers(): Promise<Person[]> {
  const d = await data()
  return d.teachers
}

export async function listStudents(): Promise<Person[]> {
  const d = await data()
  return d.students
}

export async function getPerson(id: string): Promise<Person | undefined> {
  const d = await data()
  return d.teachers.find((t) => t.id === id) ?? d.students.find((s) => s.id === id)
}

// ---------------------------------------------------------------------------
// Courses & roster
// ---------------------------------------------------------------------------

export async function getCourse(id: string): Promise<Course | undefined> {
  const d = await data()
  return d.courses.find((c) => c.id === id)
}

export async function listCoursesForTeacher(teacherId: string): Promise<Course[]> {
  const d = await data()
  return d.courses.filter((c) => c.teacherId === teacherId)
}

export async function listCoursesForStudent(studentId: string): Promise<Course[]> {
  const d = await data()
  const ids = new Set(d.enrollments.filter((e) => e.studentId === studentId).map((e) => e.courseId))
  return d.courses.filter((c) => ids.has(c.id))
}

export async function listRoster(courseId: string): Promise<Person[]> {
  const d = await data()
  const ids = new Set(d.enrollments.filter((e) => e.courseId === courseId).map((e) => e.studentId))
  return d.students.filter((s) => ids.has(s.id))
}

export async function isEnrolled(courseId: string, studentId: string): Promise<boolean> {
  const d = await data()
  return d.enrollments.some((e) => e.courseId === courseId && e.studentId === studentId)
}

export async function saveGradeSettings(courseId: string, settings: GradeSettings): Promise<void> {
  const c = await getCourse(courseId)
  if (c) c.gradeSettings = settings
}

export async function updateCourseSyllabus(courseId: string, syllabus: string): Promise<void> {
  const c = await getCourse(courseId)
  if (c) c.syllabus = syllabus
}

export async function updateCourse(
  courseId: string,
  patch: Partial<Pick<Course, 'name' | 'code' | 'color' | 'term'>>,
): Promise<void> {
  const c = await getCourse(courseId)
  if (c) Object.assign(c, patch)
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export async function listAssignments(courseId: string): Promise<Assignment[]> {
  const d = await data()
  return d
    .assignments.filter((a) => a.courseId === courseId)
    .sort((a, b) => a.position - b.position)
}

export async function getAssignment(id: string): Promise<Assignment | undefined> {
  const d = await data()
  return d.assignments.find((a) => a.id === id)
}

/** Published assignments still due, soonest first — computed here so callers
 *  (server components) don't reference the clock during render. */
/**
 * Today, formatted for the dashboard eyebrow.
 *
 * Lives here rather than in the component for the same reason the other clock
 * reads do: calling `new Date()` during render trips react-hooks/purity.
 */
export async function todayLabel(): Promise<string> {
  return new Date().toLocaleDateString('en-CA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export async function listUpcomingAssignments(courseId: string, limit: number): Promise<Assignment[]> {
  const now = Date.now()
  return (await listAssignments(courseId))
    .filter((a) => a.published && a.dueAt != null && new Date(a.dueAt).getTime() >= now)
    .sort((a, b) => (a.dueAt as string).localeCompare(b.dueAt as string))
    .slice(0, limit)
}

export interface AgendaEntry {
  assignmentId: string
  title: string
  courseId: string
  courseName: string
  courseColor: string
  dueAt: string
  points: number
  isQuiz: boolean
}

/** Published, dated assignments across the given courses that are due from the
 *  start of today onward, within `daysAhead`. Sorted soonest-first. The clock
 *  lives here so callers (server components) stay pure during render. */
export async function agendaForCourses(courseIds: string[], daysAhead = 21): Promise<AgendaEntry[]> {
  const d = await data()
  const ids = new Set(courseIds)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const until = startOfToday + daysAhead * 24 * 60 * 60 * 1000
  const out: AgendaEntry[] = []
  for (const a of d.assignments) {
    if (!ids.has(a.courseId) || !a.published || a.dueAt == null) continue
    const t = new Date(a.dueAt).getTime()
    if (t < startOfToday || t > until) continue
    const course = await getCourse(a.courseId)
    if (!course) continue
    out.push({
      assignmentId: a.id,
      title: a.title,
      courseId: a.courseId,
      courseName: course.name,
      courseColor: course.color,
      dueAt: a.dueAt,
      points: a.points,
      isQuiz: a.submissionType === 'quiz',
    })
  }
  return out.sort((a, b) => a.dueAt.localeCompare(b.dueAt))
}

/** How many published, past-due assignments a student hasn't turned in. */
export async function studentMissingCount(studentId: string): Promise<number> {
  const d = await data()
  const courseIds = new Set(
    d
      .enrollments.filter((e) => e.studentId === studentId)
      .map((e) => e.courseId),
  )
  const now = Date.now()
  let n = 0
  for (const a of d.assignments) {
    if (!courseIds.has(a.courseId) || !a.published || a.dueAt == null) continue
    if (new Date(a.dueAt).getTime() >= now) continue
    const sub = d.submissions.find((s) => s.assignmentId === a.id && s.studentId === studentId)
    if (!sub || sub.state === 'unsubmitted') n += 1
  }
  return n
}

export interface GradingQueueEntry {
  courseId: string
  courseName: string
  courseColor: string
  toGrade: number
}

/** Per-course count of submissions awaiting grading, for a teacher's courses. */
export async function teacherGradingQueue(teacherId: string): Promise<{ entries: GradingQueueEntry[]; total: number }> {
  const d = await data()
  const entries: GradingQueueEntry[] = await Promise.all(
    (await listCoursesForTeacher(teacherId)).map(async (c) => {
      const published = d.assignments.filter((a) => a.courseId === c.id && a.published)
      const counts = await Promise.all(
        published.map(async (a) =>
          (await listSubmissionsForAssignment(a.id)).filter((s) => s.state === 'submitted').length,
        ),
      )
      return {
        courseId: c.id,
        courseName: c.name,
        courseColor: c.color,
        toGrade: counts.reduce((n, x) => n + x, 0),
      }
    }),
  )
  return { entries, total: entries.reduce((n, e) => n + e.toGrade, 0) }
}

export interface SearchResults {
  courses: { id: string; name: string; code: string; color: string }[]
  assignments: { id: string; courseId: string; courseName: string; title: string; isQuiz: boolean }[]
  people: { id: string; name: string; role: 'Teacher' | 'Student'; courseName: string }[]
}

/** Search courses, assignments, and people within the viewer's own courses. */
export async function search(query: string, viewerKind: 'teacher' | 'student', viewerId: string): Promise<SearchResults> {
  const d = await data()
  const q = query.trim().toLowerCase()
  const empty: SearchResults = { courses: [], assignments: [], people: [] }
  if (!q) return empty
  const courses = viewerKind === 'teacher' ? await listCoursesForTeacher(viewerId) : await listCoursesForStudent(viewerId)
  const courseIds = new Set(courses.map((c) => c.id))

  const courseHits = courses
    .filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
    .map((c) => ({ id: c.id, name: c.name, code: c.code, color: c.color }))

  const assignmentHits = await Promise.all(
    d.assignments
      .filter((a) => courseIds.has(a.courseId) && (viewerKind === 'teacher' || a.published) && a.title.toLowerCase().includes(q))
      .map(async (a) => {
        const c = await getCourse(a.courseId)
        return { id: a.id, courseId: a.courseId, courseName: c?.name ?? '', title: a.title, isQuiz: a.submissionType === 'quiz' }
      }),
  )

  // People: teachers of + students in the viewer's courses.
  const seen = new Set<string>()
  const people: SearchResults['people'] = []
  for (const c of courses) {
    const teacher = await getPerson(c.teacherId)
    if (teacher && teacher.name.toLowerCase().includes(q) && !seen.has(`t${teacher.id}`)) {
      seen.add(`t${teacher.id}`)
      people.push({ id: teacher.id, name: teacher.name, role: 'Teacher', courseName: c.name })
    }
    for (const s of await listRoster(c.id)) {
      if (s.name.toLowerCase().includes(q) && !seen.has(`s${s.id}-${c.id}`)) {
        seen.add(`s${s.id}-${c.id}`)
        people.push({ id: s.id, name: s.name, role: 'Student', courseName: c.name })
      }
    }
  }

  return { courses: courseHits, assignments: assignmentHits, people }
}

export interface AssignmentInput {
  courseId: string
  title: string
  instructions: string
  points: number
  category: string
  dueAt: string | null
  published: boolean
  rubricId: string | null
  standardIds?: string[]
  draftCoach?: boolean
}

export async function createAssignment(input: AssignmentInput): Promise<Assignment> {
  const d = await data()
  const siblings = await listAssignments(input.courseId)
  const assignment: Assignment = {
    id: newId('a'),
    courseId: input.courseId,
    title: input.title,
    instructions: input.instructions,
    points: input.points,
    category: input.category,
    dueAt: input.dueAt,
    published: input.published,
    submissionType: 'online',
    rubricId: input.rubricId,
    standardIds: input.standardIds ?? [],
    draftCoach: input.draftCoach ?? true,
    position: siblings.length,
  }
  d.assignments.push(assignment)
  // Give every enrolled student an unsubmitted placeholder so rosters line up.
  for (const s of await listRoster(input.courseId)) {
    d.submissions.push(await emptySubmission(assignment.id, s.id))
  }
  return assignment
}

export interface QuizInput {
  courseId: string
  title: string
  instructions: string
  points: number
  category: string
  dueAt: string | null
  published: boolean
  questions: QuizQuestion[]
  standardIds?: string[]
}

/** Create a quiz: an assignment (submissionType 'quiz') plus its questions. */
export async function createQuizAssignment(input: QuizInput): Promise<Assignment> {
  const d = await data()
  const siblings = await listAssignments(input.courseId)
  const assignment: Assignment = {
    id: newId('a'),
    courseId: input.courseId,
    title: input.title,
    instructions: input.instructions,
    points: input.points,
    category: input.category,
    dueAt: input.dueAt,
    published: input.published,
    submissionType: 'quiz',
    rubricId: null,
    standardIds: input.standardIds ?? [],
    draftCoach: false,
    position: siblings.length,
  }
  d.assignments.push(assignment)
  d.quizzes.push({ assignmentId: assignment.id, questions: input.questions })
  for (const s of await listRoster(input.courseId)) {
    d.submissions.push(await emptySubmission(assignment.id, s.id))
  }
  return assignment
}

export async function updateAssignment(id: string, patch: Partial<AssignmentInput>): Promise<void> {
  const a = await getAssignment(id)
  if (!a) return
  Object.assign(a, patch)
}

/** Update a quiz's meta and replace its questions. */
export async function updateQuiz(
  assignmentId: string,
  input: {
    title: string
    instructions: string
    points: number
    category: string
    dueAt: string | null
    published: boolean
    questions: QuizQuestion[]
    standardIds?: string[]
  },
): Promise<void> {
  await updateAssignment(assignmentId, {
    title: input.title,
    instructions: input.instructions,
    points: input.points,
    category: input.category,
    dueAt: input.dueAt,
    published: input.published,
    standardIds: input.standardIds ?? [],
  })
  const quiz = (await data()).quizzes.find((q) => q.assignmentId === assignmentId)
  if (quiz) quiz.questions = input.questions
  else (await data()).quizzes.push({ assignmentId, questions: input.questions })
}

/** Delete an assignment and everything hanging off it (submissions, quiz,
 *  and any module items that referenced it). */
export async function deleteAssignment(id: string): Promise<void> {
  const d = await data()
  d.assignments = d.assignments.filter((a) => a.id !== id)
  d.submissions = d.submissions.filter((s) => s.assignmentId !== id)
  d.quizzes = d.quizzes.filter((q) => q.assignmentId !== id)
  for (const m of d.modules) {
    m.items = m.items.filter((it) => !(it.kind === 'assignment' && it.refId === id))
  }
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

async function emptySubmission(assignmentId: string, studentId: string): Promise<Submission> {
  return {
    id: `sub-${assignmentId}-${studentId}`,
    assignmentId,
    studentId,
    state: 'unsubmitted',
    submittedAt: null,
    text: '',
    attachments: [],
    score: null,
    feedback: '',
    rubricScores: [],
    standardAssessments: [],
    answers: [],
  }
}

export async function getSubmission(assignmentId: string, studentId: string): Promise<Submission> {
  const d = await data()
  const existing = d.submissions.find((s) => s.assignmentId === assignmentId && s.studentId === studentId)
  if (existing) return existing
  const created = await emptySubmission(assignmentId, studentId)
  d.submissions.push(created)
  return created
}

export async function listSubmissionsForAssignment(assignmentId: string): Promise<Submission[]> {
  const d = await data()
  return d.submissions.filter((s) => s.assignmentId === assignmentId)
}

export async function turnInSubmission(
  assignmentId: string,
  studentId: string,
  input: { text: string; attachments: { name: string; size: number }[] },
): Promise<void> {
  const sub = await getSubmission(assignmentId, studentId)
  sub.text = input.text
  if (input.attachments.length > 0) sub.attachments = input.attachments
  sub.state = 'submitted'
  sub.submittedAt = new Date().toISOString()
}

export async function gradeSubmission(
  assignmentId: string,
  studentId: string,
  input: { score: number | null; feedback: string },
): Promise<void> {
  const sub = await getSubmission(assignmentId, studentId)
  sub.score = input.score
  sub.feedback = input.feedback
  sub.state = input.score != null ? 'graded' : sub.submittedAt ? 'submitted' : 'unsubmitted'
}

/** Grade from a rubric: the score is the sum of the selected level points. */
export async function gradeSubmissionWithRubric(
  assignmentId: string,
  studentId: string,
  input: { rubricScores: RubricScore[]; feedback: string },
): Promise<void> {
  const sub = await getSubmission(assignmentId, studentId)
  sub.rubricScores = input.rubricScores
  sub.score = input.rubricScores.reduce((n, r) => n + r.points, 0)
  sub.feedback = input.feedback
  sub.state = 'graded'
}

// ---------------------------------------------------------------------------
// BC learning standards
// ---------------------------------------------------------------------------

/** Record proficiency judgements for one submission (replaces prior ones). */
export async function assessStandards(
  assignmentId: string,
  studentId: string,
  assessments: StandardAssessment[],
): Promise<void> {
  const sub = await getSubmission(assignmentId, studentId)
  sub.standardAssessments = assessments
}

/** Every standard referenced by a course's published coursework, in catalogue order. */
export async function courseStandardIds(courseId: string): Promise<string[]> {
  const seen = new Set<string>()
  for (const a of await listAssignments(courseId)) {
    if (!a.published) continue
    for (const id of a.standardIds ?? []) seen.add(id)
  }
  return (await listStandards()).filter((s) => seen.has(s.id)).map((s) => s.id)
}

// ---------------------------------------------------------------------------
// Report-card comments
// ---------------------------------------------------------------------------

export async function getReportComment(courseId: string, studentId: string): Promise<ReportComment | undefined> {
  const d = await data()
  return d.reportComments.find((c) => c.courseId === courseId && c.studentId === studentId)
}

export async function listReportComments(courseId: string): Promise<ReportComment[]> {
  const d = await data()
  return d.reportComments.filter((c) => c.courseId === courseId)
}

/** Save the teacher's text. The draft it started from is kept for comparison. */
export async function saveReportComment(input: {
  courseId: string
  studentId: string
  body: string
  draft: string
  drafterId: string
}): Promise<void> {
  const d = await data()
  const existing = d.reportComments.find(
    (c) => c.courseId === input.courseId && c.studentId === input.studentId,
  )
  const updatedAt = new Date().toISOString()
  if (existing) {
    existing.body = input.body
    existing.draft = input.draft
    existing.drafterId = input.drafterId
    existing.updatedAt = updatedAt
  } else {
    d.reportComments.push({ ...input, updatedAt })
  }
}

// ---------------------------------------------------------------------------
// Draft-feedback request log
// ---------------------------------------------------------------------------

/** Record that a student asked for feedback. Content is never stored. */
export async function logCoachRequest(input: {
  assignmentId: string
  studentId: string
  coachId: string
  words: number
}): Promise<void> {
  const d = await data()
  d.coachRequests.push({ ...input, at: new Date().toISOString() })
}

export async function listCoachRequests(assignmentId: string): Promise<DraftCoachRequest[]> {
  const d = await data()
  return d.coachRequests.filter((r) => r.assignmentId === assignmentId)
}

export async function clearReportComment(courseId: string, studentId: string): Promise<void> {
  const d = await data()
  d.reportComments = d.reportComments.filter(
    (c) => !(c.courseId === courseId && c.studentId === studentId),
  )
}

export interface StandardMastery {
  standardId: string
  /** Most recent judgement (by submission date), the BC "most recent evidence" view. */
  latest: ProficiencyLevel | null
  /** Every judgement recorded, oldest first — the evidence trail. */
  history: { level: ProficiencyLevel; assignmentId: string; assignmentTitle: string; at: string | null }[]
}

/** A student's proficiency per standard across a course's coursework. */
export async function studentMastery(courseId: string, studentId: string): Promise<StandardMastery[]> {
  const d = await data()
  const assignments = (await listAssignments(courseId)).filter((a) => a.published)
  const byStandard = new Map<string, StandardMastery['history']>()

  for (const a of assignments) {
    const sub = d.submissions.find((s) => s.assignmentId === a.id && s.studentId === studentId)
    if (!sub) continue
    for (const sa of sub.standardAssessments ?? []) {
      const arr = byStandard.get(sa.standardId) ?? []
      arr.push({ level: sa.level, assignmentId: a.id, assignmentTitle: a.title, at: sub.submittedAt ?? a.dueAt })
      byStandard.set(sa.standardId, arr)
    }
  }

  return (await courseStandardIds(courseId)).map((standardId) => {
    const history = (byStandard.get(standardId) ?? []).sort((x, y) => (x.at ?? '').localeCompare(y.at ?? ''))
    return { standardId, latest: history.length > 0 ? history[history.length - 1].level : null, history }
  })
}

// ---------------------------------------------------------------------------
// Quizzes (auto-graded)
// ---------------------------------------------------------------------------

export async function getQuiz(assignmentId: string): Promise<Quiz | undefined> {
  const d = await data()
  return d.quizzes.find((q) => q.assignmentId === assignmentId)
}

/** Auto-grade a quiz on submit: score = (correct / total) × assignment points.
 *  Returns the earned score and the max, or null if there's no quiz. */
export async function submitQuiz(
  assignmentId: string,
  studentId: string,
  answers: number[],
): Promise<{ correct: number; total: number; score: number; points: number } | null> {
  const quiz = await getQuiz(assignmentId)
  const assignment = await getAssignment(assignmentId)
  if (!quiz || !assignment) return null
  const total = quiz.questions.length
  const correct = quiz.questions.reduce((n, q, i) => n + (answers[i] === q.correctIndex ? 1 : 0), 0)
  const score = total > 0 ? Math.round((correct / total) * assignment.points) : 0
  const sub = await getSubmission(assignmentId, studentId)
  sub.answers = answers
  sub.score = score
  sub.state = 'graded'
  sub.submittedAt = new Date().toISOString()
  sub.feedback = `Auto-graded: ${correct} of ${total} correct.`
  return { correct, total, score, points: assignment.points }
}

// ---------------------------------------------------------------------------
// Grades
// ---------------------------------------------------------------------------

export async function courseGradeForStudent(courseId: string, studentId: string): Promise<CourseGrade> {
  const course = await getCourse(courseId)
  if (!course) return { pct: null, letter: null, categories: [] }
  const items: ScoredItem[] = await Promise.all(
    (await listAssignments(courseId))
      .filter((a) => a.published)
      .map(async (a) => ({ assignment: a, score: (await getSubmission(a.id, studentId)).score })),
  )
  return computeCourseGrade(items, course.gradeSettings)
}

// ---------------------------------------------------------------------------
// Modules & pages
// ---------------------------------------------------------------------------

export async function listModules(courseId: string): Promise<CourseModule[]> {
  const d = await data()
  return d
    .modules.filter((m) => m.courseId === courseId)
    .sort((a, b) => a.position - b.position)
}

export async function getPage(id: string): Promise<Page | undefined> {
  const d = await data()
  return d.pages.find((p) => p.id === id)
}

export async function createModule(courseId: string, name: string): Promise<CourseModule> {
  const d = await data()
  const mod: CourseModule = {
    id: newId('m'),
    courseId,
    name,
    position: (await listModules(courseId)).length,
    published: true,
    items: [],
  }
  d.modules.push(mod)
  return mod
}

export async function addModuleItem(moduleId: string, item: Omit<ModuleItem, 'id' | 'position'>): Promise<void> {
  const d = await data()
  const mod = d.modules.find((m) => m.id === moduleId)
  if (!mod) return
  mod.items.push({ ...item, id: newId('mi'), position: mod.items.length })
}

export async function deleteModule(moduleId: string): Promise<void> {
  const d = await data()
  d.modules = d.modules.filter((m) => m.id !== moduleId)
}

export async function deleteModuleItem(moduleId: string, itemId: string): Promise<void> {
  const d = await data()
  const mod = d.modules.find((m) => m.id === moduleId)
  if (mod) mod.items = mod.items.filter((it) => it.id !== itemId)
}

type Direction = 'up' | 'down'

/** Swap an item with its neighbor and renumber positions 0..n. */
export async function moveModuleItem(moduleId: string, itemId: string, dir: Direction): Promise<void> {
  const d = await data()
  const mod = d.modules.find((m) => m.id === moduleId)
  if (!mod) return
  const items = [...mod.items].sort((a, b) => a.position - b.position)
  const idx = items.findIndex((it) => it.id === itemId)
  const swap = dir === 'up' ? idx - 1 : idx + 1
  if (idx < 0 || swap < 0 || swap >= items.length) return
  ;[items[idx], items[swap]] = [items[swap], items[idx]]
  items.forEach((it, i) => (it.position = i))
}

/** Swap a module with its neighbor within its course and renumber. */
export async function moveModule(courseId: string, moduleId: string, dir: Direction): Promise<void> {
  const d = await data()
  const mods = d
    .modules.filter((m) => m.courseId === courseId)
    .sort((a, b) => a.position - b.position)
  const idx = mods.findIndex((m) => m.id === moduleId)
  const swap = dir === 'up' ? idx - 1 : idx + 1
  if (idx < 0 || swap < 0 || swap >= mods.length) return
  ;[mods[idx], mods[swap]] = [mods[swap], mods[idx]]
  mods.forEach((m, i) => (m.position = i))
}

// ---------------------------------------------------------------------------
// Rubrics
// ---------------------------------------------------------------------------

export async function getRubric(id: string): Promise<Rubric | undefined> {
  const d = await data()
  return d.rubrics.find((r) => r.id === id)
}

export async function listRubrics(courseId: string): Promise<Rubric[]> {
  const d = await data()
  return d.rubrics.filter((r) => r.courseId === courseId)
}

// ---------------------------------------------------------------------------
// Announcements & discussions
// ---------------------------------------------------------------------------

export async function listAnnouncements(courseId: string): Promise<Announcement[]> {
  const d = await data()
  return d
    .announcements.filter((a) => a.courseId === courseId)
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
}

export async function createAnnouncement(input: { courseId: string; authorId: string; title: string; body: string }): Promise<void> {
  const d = await data()
  d.announcements.push({
    id: newId('an'),
    courseId: input.courseId,
    authorId: input.authorId,
    title: input.title,
    body: input.body,
    postedAt: new Date().toISOString(),
  })
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const d = await data()
  d.announcements = d.announcements.filter((a) => a.id !== id)
}

export async function listDiscussionTopics(courseId: string): Promise<DiscussionTopic[]> {
  const d = await data()
  return d
    .discussionTopics.filter((t) => t.courseId === courseId)
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
}

export async function getDiscussionTopic(id: string): Promise<DiscussionTopic | undefined> {
  const d = await data()
  return d.discussionTopics.find((t) => t.id === id)
}

export async function listDiscussionPosts(topicId: string): Promise<DiscussionPost[]> {
  const d = await data()
  return d
    .discussionPosts.filter((p) => p.topicId === topicId)
    .sort((a, b) => a.postedAt.localeCompare(b.postedAt))
}

export async function createDiscussionTopic(input: { courseId: string; authorId: string; title: string; body: string }): Promise<DiscussionTopic> {
  const d = await data()
  const topic: DiscussionTopic = {
    id: newId('dt'),
    courseId: input.courseId,
    authorId: input.authorId,
    title: input.title,
    body: input.body,
    postedAt: new Date().toISOString(),
  }
  d.discussionTopics.push(topic)
  return topic
}

export async function deleteDiscussionTopic(id: string): Promise<void> {
  const d = await data()
  d.discussionTopics = d.discussionTopics.filter((t) => t.id !== id)
  d.discussionPosts = d.discussionPosts.filter((p) => p.topicId !== id)
}

export async function addDiscussionPost(input: { topicId: string; authorId: string; body: string; parentId: string | null }): Promise<void> {
  const d = await data()
  d.discussionPosts.push({
    id: newId('dp'),
    topicId: input.topicId,
    authorId: input.authorId,
    body: input.body,
    postedAt: new Date().toISOString(),
    parentId: input.parentId,
  })
}
