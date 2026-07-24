// Self-contained domain model for the standalone LMS (tcs-canvas).
// Nothing here references the main site's Supabase tables, auth, or RLS — this
// is a pure UX playground seeded with mock data. When the sandbox graduates,
// these shapes map onto real `lms_*` tables (see the plan file), but for now
// they live entirely in memory.

export type IdentityKind = 'teacher' | 'student'

export interface Identity {
  kind: IdentityKind
  id: string
}

export interface Person {
  id: string
  name: string
  email: string
  /** Deterministic avatar tint so faces stay recognizable across pages. */
  color: string
}

export type GradeCalc = 'weighted' | 'total' | 'none'

export interface GradeCategory {
  name: string
  /** Weight as a percentage; only meaningful when calc === 'weighted'. */
  weight: number
}

export interface GradeSettings {
  calc: GradeCalc
  categories: GradeCategory[]
  /** When false, students see per-assignment scores but no overall grade. */
  showTotalsToStudents: boolean
}

export interface Course {
  id: string
  code: string
  name: string
  term: string
  teacherId: string
  /** Course card / nav accent. */
  color: string
  /** Syllabus body (trusted HTML authored in-sandbox). */
  syllabus: string
  published: boolean
  gradeSettings: GradeSettings
}

/** Roster link: which students are in which course. */
export interface Enrollment {
  courseId: string
  studentId: string
}

export type SubmissionType = 'online' | 'offline' | 'quiz'

export interface Assignment {
  id: string
  courseId: string
  title: string
  /** Trusted HTML authored in-sandbox by the teacher. */
  instructions: string
  points: number
  /** Must match a GradeCategory.name on the course. */
  category: string
  /** ISO string, or null for "no due date". */
  dueAt: string | null
  published: boolean
  submissionType: SubmissionType
  rubricId: string | null
  /** Display ordering within the Assignments list. */
  position: number
}

export type SubmissionState = 'unsubmitted' | 'submitted' | 'graded'

export interface SubmissionAttachment {
  name: string
  size: number
}

export interface RubricScore {
  criterionId: string
  points: number
}

export interface Submission {
  id: string
  assignmentId: string
  studentId: string
  state: SubmissionState
  submittedAt: string | null
  text: string
  attachments: SubmissionAttachment[]
  score: number | null
  feedback: string
  rubricScores: RubricScore[]
  /** For quiz submissions: the chosen option index per question, aligned to
   *  the quiz's question order. Empty for non-quiz work. */
  answers: number[]
}

export type QuestionKind = 'mc' | 'tf'

export interface QuizQuestion {
  id: string
  prompt: string
  kind: QuestionKind
  /** Answer choices. For 'tf' this is ['True', 'False']. */
  options: string[]
  correctIndex: number
}

/** A quiz is attached to an assignment whose submissionType is 'quiz'; it is
 *  auto-graded on submit and flows into the gradebook like any assignment. */
export interface Quiz {
  assignmentId: string
  questions: QuizQuestion[]
}

export interface RubricLevel {
  label: string
  points: number
  description: string
}

export interface RubricCriterion {
  id: string
  name: string
  levels: RubricLevel[]
}

export interface Rubric {
  id: string
  courseId: string
  title: string
  criteria: RubricCriterion[]
}

export type ModuleItemKind = 'assignment' | 'page' | 'link' | 'file'

export interface ModuleItem {
  id: string
  kind: ModuleItemKind
  title: string
  /** Assignment id for kind==='assignment', page id for 'page'. */
  refId: string | null
  /** External URL for kind==='link'. */
  url: string | null
  /** Size in bytes for kind==='file' (metadata only — no content stored). */
  fileSize?: number | null
  position: number
}

export interface CourseModule {
  id: string
  courseId: string
  name: string
  position: number
  published: boolean
  items: ModuleItem[]
}

export interface Page {
  id: string
  courseId: string
  title: string
  body: string
}

export interface Announcement {
  id: string
  courseId: string
  authorId: string
  title: string
  body: string
  postedAt: string
}

export interface DiscussionPost {
  id: string
  topicId: string
  authorId: string
  body: string
  postedAt: string
  /** Reply threading; null for a top-level post. */
  parentId: string | null
}

export interface DiscussionTopic {
  id: string
  courseId: string
  authorId: string
  title: string
  body: string
  postedAt: string
}

/** The whole sandbox world, held in one mutable object (see store.ts). */
export interface LmsData {
  teachers: Person[]
  students: Person[]
  courses: Course[]
  enrollments: Enrollment[]
  modules: CourseModule[]
  pages: Page[]
  assignments: Assignment[]
  submissions: Submission[]
  quizzes: Quiz[]
  rubrics: Rubric[]
  announcements: Announcement[]
  discussionTopics: DiscussionTopic[]
  discussionPosts: DiscussionPost[]
}
