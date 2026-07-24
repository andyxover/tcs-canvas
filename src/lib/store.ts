// In-memory data store for the LMS sandbox. A single mutable world lives on
// globalThis so it survives dev hot-reloads (and resets on a full server
// restart — exactly what you want for a demo playground). No database, no RLS.
//
// When the sandbox graduates, this module is the seam to replace: swap these
// functions for real Supabase reads/writes and the UI keeps working unchanged.

import { buildSeed } from './seed'
import { computeCourseGrade, type CourseGrade, type ScoredItem } from './grade-calc'
import { BC_STANDARDS, type ProficiencyLevel } from './bc-curriculum'
import type {
  Announcement,
  Assignment,
  Course,
  CourseModule,
  DiscussionPost,
  DiscussionTopic,
  GradeSettings,
  LmsData,
  ModuleItem,
  Page,
  Person,
  Quiz,
  QuizQuestion,
  Rubric,
  RubricScore,
  StandardAssessment,
  Submission,
} from './types'

const globalRef = globalThis as unknown as { __lmsLabData?: LmsData }

function data(): LmsData {
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

export function listTeachers(): Person[] {
  return data().teachers
}

export function listStudents(): Person[] {
  return data().students
}

export function getPerson(id: string): Person | undefined {
  return data().teachers.find((t) => t.id === id) ?? data().students.find((s) => s.id === id)
}

// ---------------------------------------------------------------------------
// Courses & roster
// ---------------------------------------------------------------------------

export function getCourse(id: string): Course | undefined {
  return data().courses.find((c) => c.id === id)
}

export function listCoursesForTeacher(teacherId: string): Course[] {
  return data().courses.filter((c) => c.teacherId === teacherId)
}

export function listCoursesForStudent(studentId: string): Course[] {
  const ids = new Set(data().enrollments.filter((e) => e.studentId === studentId).map((e) => e.courseId))
  return data().courses.filter((c) => ids.has(c.id))
}

export function listRoster(courseId: string): Person[] {
  const ids = new Set(data().enrollments.filter((e) => e.courseId === courseId).map((e) => e.studentId))
  return data().students.filter((s) => ids.has(s.id))
}

export function isEnrolled(courseId: string, studentId: string): boolean {
  return data().enrollments.some((e) => e.courseId === courseId && e.studentId === studentId)
}

export function saveGradeSettings(courseId: string, settings: GradeSettings): void {
  const c = getCourse(courseId)
  if (c) c.gradeSettings = settings
}

export function updateCourseSyllabus(courseId: string, syllabus: string): void {
  const c = getCourse(courseId)
  if (c) c.syllabus = syllabus
}

export function updateCourse(
  courseId: string,
  patch: Partial<Pick<Course, 'name' | 'code' | 'color' | 'term'>>,
): void {
  const c = getCourse(courseId)
  if (c) Object.assign(c, patch)
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export function listAssignments(courseId: string): Assignment[] {
  return data()
    .assignments.filter((a) => a.courseId === courseId)
    .sort((a, b) => a.position - b.position)
}

export function getAssignment(id: string): Assignment | undefined {
  return data().assignments.find((a) => a.id === id)
}

/** Published assignments still due, soonest first — computed here so callers
 *  (server components) don't reference the clock during render. */
export function listUpcomingAssignments(courseId: string, limit: number): Assignment[] {
  const now = Date.now()
  return listAssignments(courseId)
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
export function agendaForCourses(courseIds: string[], daysAhead = 21): AgendaEntry[] {
  const ids = new Set(courseIds)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const until = startOfToday + daysAhead * 24 * 60 * 60 * 1000
  const out: AgendaEntry[] = []
  for (const a of data().assignments) {
    if (!ids.has(a.courseId) || !a.published || a.dueAt == null) continue
    const t = new Date(a.dueAt).getTime()
    if (t < startOfToday || t > until) continue
    const course = getCourse(a.courseId)
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
export function studentMissingCount(studentId: string): number {
  const courseIds = new Set(
    data()
      .enrollments.filter((e) => e.studentId === studentId)
      .map((e) => e.courseId),
  )
  const now = Date.now()
  let n = 0
  for (const a of data().assignments) {
    if (!courseIds.has(a.courseId) || !a.published || a.dueAt == null) continue
    if (new Date(a.dueAt).getTime() >= now) continue
    const sub = data().submissions.find((s) => s.assignmentId === a.id && s.studentId === studentId)
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
export function teacherGradingQueue(teacherId: string): { entries: GradingQueueEntry[]; total: number } {
  const entries: GradingQueueEntry[] = listCoursesForTeacher(teacherId).map((c) => {
    const toGrade = data()
      .assignments.filter((a) => a.courseId === c.id && a.published)
      .reduce((n, a) => n + listSubmissionsForAssignment(a.id).filter((s) => s.state === 'submitted').length, 0)
    return { courseId: c.id, courseName: c.name, courseColor: c.color, toGrade }
  })
  return { entries, total: entries.reduce((n, e) => n + e.toGrade, 0) }
}

export interface SearchResults {
  courses: { id: string; name: string; code: string; color: string }[]
  assignments: { id: string; courseId: string; courseName: string; title: string; isQuiz: boolean }[]
  people: { id: string; name: string; role: 'Teacher' | 'Student'; courseName: string }[]
}

/** Search courses, assignments, and people within the viewer's own courses. */
export function search(query: string, viewerKind: 'teacher' | 'student', viewerId: string): SearchResults {
  const q = query.trim().toLowerCase()
  const empty: SearchResults = { courses: [], assignments: [], people: [] }
  if (!q) return empty
  const courses = viewerKind === 'teacher' ? listCoursesForTeacher(viewerId) : listCoursesForStudent(viewerId)
  const courseIds = new Set(courses.map((c) => c.id))

  const courseHits = courses
    .filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
    .map((c) => ({ id: c.id, name: c.name, code: c.code, color: c.color }))

  const assignmentHits = data()
    .assignments.filter((a) => courseIds.has(a.courseId) && (viewerKind === 'teacher' || a.published) && a.title.toLowerCase().includes(q))
    .map((a) => {
      const c = getCourse(a.courseId)
      return { id: a.id, courseId: a.courseId, courseName: c?.name ?? '', title: a.title, isQuiz: a.submissionType === 'quiz' }
    })

  // People: teachers of + students in the viewer's courses.
  const seen = new Set<string>()
  const people: SearchResults['people'] = []
  for (const c of courses) {
    const teacher = getPerson(c.teacherId)
    if (teacher && teacher.name.toLowerCase().includes(q) && !seen.has(`t${teacher.id}`)) {
      seen.add(`t${teacher.id}`)
      people.push({ id: teacher.id, name: teacher.name, role: 'Teacher', courseName: c.name })
    }
    for (const s of listRoster(c.id)) {
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
}

export function createAssignment(input: AssignmentInput): Assignment {
  const siblings = listAssignments(input.courseId)
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
    position: siblings.length,
  }
  data().assignments.push(assignment)
  // Give every enrolled student an unsubmitted placeholder so rosters line up.
  for (const s of listRoster(input.courseId)) {
    data().submissions.push(emptySubmission(assignment.id, s.id))
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
export function createQuizAssignment(input: QuizInput): Assignment {
  const siblings = listAssignments(input.courseId)
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
    position: siblings.length,
  }
  data().assignments.push(assignment)
  data().quizzes.push({ assignmentId: assignment.id, questions: input.questions })
  for (const s of listRoster(input.courseId)) {
    data().submissions.push(emptySubmission(assignment.id, s.id))
  }
  return assignment
}

export function updateAssignment(id: string, patch: Partial<AssignmentInput>): void {
  const a = getAssignment(id)
  if (!a) return
  Object.assign(a, patch)
}

/** Update a quiz's meta and replace its questions. */
export function updateQuiz(
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
): void {
  updateAssignment(assignmentId, {
    title: input.title,
    instructions: input.instructions,
    points: input.points,
    category: input.category,
    dueAt: input.dueAt,
    published: input.published,
    standardIds: input.standardIds ?? [],
  })
  const quiz = data().quizzes.find((q) => q.assignmentId === assignmentId)
  if (quiz) quiz.questions = input.questions
  else data().quizzes.push({ assignmentId, questions: input.questions })
}

/** Delete an assignment and everything hanging off it (submissions, quiz,
 *  and any module items that referenced it). */
export function deleteAssignment(id: string): void {
  const d = data()
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

function emptySubmission(assignmentId: string, studentId: string): Submission {
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

export function getSubmission(assignmentId: string, studentId: string): Submission {
  const existing = data().submissions.find((s) => s.assignmentId === assignmentId && s.studentId === studentId)
  if (existing) return existing
  const created = emptySubmission(assignmentId, studentId)
  data().submissions.push(created)
  return created
}

export function listSubmissionsForAssignment(assignmentId: string): Submission[] {
  return data().submissions.filter((s) => s.assignmentId === assignmentId)
}

export function turnInSubmission(
  assignmentId: string,
  studentId: string,
  input: { text: string; attachments: { name: string; size: number }[] },
): void {
  const sub = getSubmission(assignmentId, studentId)
  sub.text = input.text
  if (input.attachments.length > 0) sub.attachments = input.attachments
  sub.state = 'submitted'
  sub.submittedAt = new Date().toISOString()
}

export function gradeSubmission(
  assignmentId: string,
  studentId: string,
  input: { score: number | null; feedback: string },
): void {
  const sub = getSubmission(assignmentId, studentId)
  sub.score = input.score
  sub.feedback = input.feedback
  sub.state = input.score != null ? 'graded' : sub.submittedAt ? 'submitted' : 'unsubmitted'
}

/** Grade from a rubric: the score is the sum of the selected level points. */
export function gradeSubmissionWithRubric(
  assignmentId: string,
  studentId: string,
  input: { rubricScores: RubricScore[]; feedback: string },
): void {
  const sub = getSubmission(assignmentId, studentId)
  sub.rubricScores = input.rubricScores
  sub.score = input.rubricScores.reduce((n, r) => n + r.points, 0)
  sub.feedback = input.feedback
  sub.state = 'graded'
}

// ---------------------------------------------------------------------------
// BC learning standards
// ---------------------------------------------------------------------------

/** Record proficiency judgements for one submission (replaces prior ones). */
export function assessStandards(
  assignmentId: string,
  studentId: string,
  assessments: StandardAssessment[],
): void {
  const sub = getSubmission(assignmentId, studentId)
  sub.standardAssessments = assessments
}

/** Every standard referenced by a course's published coursework, in catalogue order. */
export function courseStandardIds(courseId: string): string[] {
  const seen = new Set<string>()
  for (const a of listAssignments(courseId)) {
    if (!a.published) continue
    for (const id of a.standardIds ?? []) seen.add(id)
  }
  return BC_STANDARDS.filter((s) => seen.has(s.id)).map((s) => s.id)
}

export interface StandardMastery {
  standardId: string
  /** Most recent judgement (by submission date), the BC "most recent evidence" view. */
  latest: ProficiencyLevel | null
  /** Every judgement recorded, oldest first — the evidence trail. */
  history: { level: ProficiencyLevel; assignmentId: string; assignmentTitle: string; at: string | null }[]
}

/** A student's proficiency per standard across a course's coursework. */
export function studentMastery(courseId: string, studentId: string): StandardMastery[] {
  const assignments = listAssignments(courseId).filter((a) => a.published)
  const byStandard = new Map<string, StandardMastery['history']>()

  for (const a of assignments) {
    const sub = data().submissions.find((s) => s.assignmentId === a.id && s.studentId === studentId)
    if (!sub) continue
    for (const sa of sub.standardAssessments ?? []) {
      const arr = byStandard.get(sa.standardId) ?? []
      arr.push({ level: sa.level, assignmentId: a.id, assignmentTitle: a.title, at: sub.submittedAt ?? a.dueAt })
      byStandard.set(sa.standardId, arr)
    }
  }

  return courseStandardIds(courseId).map((standardId) => {
    const history = (byStandard.get(standardId) ?? []).sort((x, y) => (x.at ?? '').localeCompare(y.at ?? ''))
    return { standardId, latest: history.length > 0 ? history[history.length - 1].level : null, history }
  })
}

// ---------------------------------------------------------------------------
// Quizzes (auto-graded)
// ---------------------------------------------------------------------------

export function getQuiz(assignmentId: string): Quiz | undefined {
  return data().quizzes.find((q) => q.assignmentId === assignmentId)
}

/** Auto-grade a quiz on submit: score = (correct / total) × assignment points.
 *  Returns the earned score and the max, or null if there's no quiz. */
export function submitQuiz(
  assignmentId: string,
  studentId: string,
  answers: number[],
): { correct: number; total: number; score: number; points: number } | null {
  const quiz = getQuiz(assignmentId)
  const assignment = getAssignment(assignmentId)
  if (!quiz || !assignment) return null
  const total = quiz.questions.length
  const correct = quiz.questions.reduce((n, q, i) => n + (answers[i] === q.correctIndex ? 1 : 0), 0)
  const score = total > 0 ? Math.round((correct / total) * assignment.points) : 0
  const sub = getSubmission(assignmentId, studentId)
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

export function courseGradeForStudent(courseId: string, studentId: string): CourseGrade {
  const course = getCourse(courseId)
  if (!course) return { pct: null, letter: null, categories: [] }
  const items: ScoredItem[] = listAssignments(courseId)
    .filter((a) => a.published)
    .map((a) => ({ assignment: a, score: getSubmission(a.id, studentId).score }))
  return computeCourseGrade(items, course.gradeSettings)
}

// ---------------------------------------------------------------------------
// Modules & pages
// ---------------------------------------------------------------------------

export function listModules(courseId: string): CourseModule[] {
  return data()
    .modules.filter((m) => m.courseId === courseId)
    .sort((a, b) => a.position - b.position)
}

export function getPage(id: string): Page | undefined {
  return data().pages.find((p) => p.id === id)
}

export function createModule(courseId: string, name: string): CourseModule {
  const mod: CourseModule = {
    id: newId('m'),
    courseId,
    name,
    position: listModules(courseId).length,
    published: true,
    items: [],
  }
  data().modules.push(mod)
  return mod
}

export function addModuleItem(moduleId: string, item: Omit<ModuleItem, 'id' | 'position'>): void {
  const mod = data().modules.find((m) => m.id === moduleId)
  if (!mod) return
  mod.items.push({ ...item, id: newId('mi'), position: mod.items.length })
}

export function deleteModule(moduleId: string): void {
  data().modules = data().modules.filter((m) => m.id !== moduleId)
}

export function deleteModuleItem(moduleId: string, itemId: string): void {
  const mod = data().modules.find((m) => m.id === moduleId)
  if (mod) mod.items = mod.items.filter((it) => it.id !== itemId)
}

type Direction = 'up' | 'down'

/** Swap an item with its neighbor and renumber positions 0..n. */
export function moveModuleItem(moduleId: string, itemId: string, dir: Direction): void {
  const mod = data().modules.find((m) => m.id === moduleId)
  if (!mod) return
  const items = [...mod.items].sort((a, b) => a.position - b.position)
  const idx = items.findIndex((it) => it.id === itemId)
  const swap = dir === 'up' ? idx - 1 : idx + 1
  if (idx < 0 || swap < 0 || swap >= items.length) return
  ;[items[idx], items[swap]] = [items[swap], items[idx]]
  items.forEach((it, i) => (it.position = i))
}

/** Swap a module with its neighbor within its course and renumber. */
export function moveModule(courseId: string, moduleId: string, dir: Direction): void {
  const mods = data()
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

export function getRubric(id: string): Rubric | undefined {
  return data().rubrics.find((r) => r.id === id)
}

export function listRubrics(courseId: string): Rubric[] {
  return data().rubrics.filter((r) => r.courseId === courseId)
}

// ---------------------------------------------------------------------------
// Announcements & discussions
// ---------------------------------------------------------------------------

export function listAnnouncements(courseId: string): Announcement[] {
  return data()
    .announcements.filter((a) => a.courseId === courseId)
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
}

export function createAnnouncement(input: { courseId: string; authorId: string; title: string; body: string }): void {
  data().announcements.push({
    id: newId('an'),
    courseId: input.courseId,
    authorId: input.authorId,
    title: input.title,
    body: input.body,
    postedAt: new Date().toISOString(),
  })
}

export function deleteAnnouncement(id: string): void {
  data().announcements = data().announcements.filter((a) => a.id !== id)
}

export function listDiscussionTopics(courseId: string): DiscussionTopic[] {
  return data()
    .discussionTopics.filter((t) => t.courseId === courseId)
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
}

export function getDiscussionTopic(id: string): DiscussionTopic | undefined {
  return data().discussionTopics.find((t) => t.id === id)
}

export function listDiscussionPosts(topicId: string): DiscussionPost[] {
  return data()
    .discussionPosts.filter((p) => p.topicId === topicId)
    .sort((a, b) => a.postedAt.localeCompare(b.postedAt))
}

export function createDiscussionTopic(input: { courseId: string; authorId: string; title: string; body: string }): DiscussionTopic {
  const topic: DiscussionTopic = {
    id: newId('dt'),
    courseId: input.courseId,
    authorId: input.authorId,
    title: input.title,
    body: input.body,
    postedAt: new Date().toISOString(),
  }
  data().discussionTopics.push(topic)
  return topic
}

export function deleteDiscussionTopic(id: string): void {
  data().discussionTopics = data().discussionTopics.filter((t) => t.id !== id)
  data().discussionPosts = data().discussionPosts.filter((p) => p.topicId !== id)
}

export function addDiscussionPost(input: { topicId: string; authorId: string; body: string; parentId: string | null }): void {
  data().discussionPosts.push({
    id: newId('dp'),
    topicId: input.topicId,
    authorId: input.authorId,
    body: input.body,
    postedAt: new Date().toISOString(),
    parentId: input.parentId,
  })
}
