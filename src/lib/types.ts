// Self-contained domain model for the standalone LMS (tcs-canvas).
// Nothing here references the main site's Supabase tables, auth, or RLS — this
// is a pure UX playground seeded with mock data. When the sandbox graduates,
// these shapes map onto real `lms_*` tables (see the plan file), but for now
// they live entirely in memory.

export type IdentityKind = 'teacher' | 'student' | 'guardian'

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
  /** Which BC curriculum this course draws its learning standards from. */
  curriculum?: { subject: string; grade: string }
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
  /** BC learning standards this coursework assesses (ids into the BC catalogue). */
  standardIds: string[]
  /**
   * Whether students may ask for formative feedback on a draft of this task.
   *
   * Per-assignment and teacher-owned on purpose: a task assessing independent
   * writing, or a take-home meant to be unaided, has to be able to switch this
   * off. A single school-wide setting would be the wrong granularity.
   */
  draftCoach: boolean
  /**
   * Whether how the student wrote this is recorded for the teacher to see.
   *
   * Per-assignment and off by default in the seed for anything low-stakes: a
   * homework worksheet does not warrant recording how someone worked, and
   * switching it on everywhere by reflex is how a reasonable tool becomes
   * surveillance.
   */
  processCapture: boolean
  /**
   * True when the English itself is what this task measures — a reading
   * comprehension, a vocabulary check, a test of following written instructions.
   * Translation is refused for these, because it would delete the measurement
   * rather than remove a barrier.
   */
  languageIsAssessed: boolean
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

/** A teacher's judgement of one student's proficiency on one BC standard,
 *  evidenced by a particular piece of coursework. */
export interface StandardAssessment {
  standardId: string
  level: import('./bc-curriculum').ProficiencyLevel
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
  /** Per-standard proficiency judgements for this submission. */
  standardAssessments: StandardAssessment[]
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
/**
 * A term report-card comment for one student in one course.
 *
 * The teacher's edited text is what counts — `draft` is kept alongside it only so
 * the UI can show what was proposed versus what was signed, which is the
 * distinction that keeps the drafting assistive rather than authoritative.
 */
export interface ReportComment {
  courseId: string
  studentId: string
  /** What the teacher actually wrote and stands behind. */
  body: string
  /** The untouched draft it started from. */
  draft: string
  drafterId: string
  updatedAt: string
}

/**
 * A record that a student asked for feedback on a draft.
 *
 * The draft and the feedback text are deliberately NOT stored. What the teacher
 * needs to know is that the tool was used and how often — enough that this is not
 * a black box running between a student and a model inside their classroom, and
 * not so much that it becomes surveillance of a student's unfinished thinking.
 */
export interface DraftCoachRequest {
  assignmentId: string
  studentId: string
  at: string
  coachId: string
  /** Draft length when they asked — shows whether they asked early or late. */
  words: number
}

/**
 * A student saying "this practice question looks wrong".
 *
 * The mitigation for the one failure mode generated practice really has: a
 * confidently wrong answer key, which a student working alone cannot detect.
 * Rather than pretend that never happens, it is routed to the person who can
 * actually adjudicate it. The question is stored verbatim so the teacher can
 * judge without having to reproduce it.
 */
export interface PracticeFlag {
  id: string
  courseId: string
  studentId: string
  standardCode: string
  prompt: string
  /** The answer key as shown to the student. */
  given: string
  note: string
  at: string
  resolved: boolean
}

/**
 * One recorded change to a draft.
 *
 * EVENTS, NOT CONTENT — this is the central design decision. A full keystroke
 * log or periodic snapshots would let you replay the text itself, including
 * every sentence the student typed and deleted. That captures a person's
 * unfinished thinking, which is none of the school's business, and it answers no
 * question a teacher actually has. What a teacher wants to know is whether the
 * work was composed or arrived in blocks, and length-over-time plus paste sizes
 * answers exactly that while storing none of the writing.
 */
export interface WritingEvent {
  /** Milliseconds since the first event recorded for this submission. */
  t: number
  kind: 'type' | 'paste' | 'delete'
  /** Document length after the event. */
  len: number
  /** Characters added, or removed for a delete. Always positive. */
  delta: number
}

export interface WritingHistory {
  assignmentId: string
  studentId: string
  startedAt: string
  /** Wall-clock milliseconds the editor was actually focused. */
  activeMs: number
  events: WritingEvent[]
}

/**
 * Who may see a given child.
 *
 * Kept as an explicit link table rather than a field on the student, because a
 * child routinely has two guardians and a guardian routinely has more than one
 * child at the school. Every guardian-facing read resolves through this and
 * nothing else — it is the only thing standing between one family and another's
 * evidence.
 */
export interface Guardianship {
  guardianId: string
  studentId: string
  /** Shown to the teacher so they know who they are writing for. */
  relation: string
  /** The language this guardian reads. Digests are written in it. */
  language: string
}

export interface LmsData {
  teachers: Person[]
  students: Person[]
  guardians: Person[]
  guardianships: Guardianship[]
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
  reportComments: ReportComment[]
  coachRequests: DraftCoachRequest[]
  practiceFlags: PracticeFlag[]
  writingHistories: WritingHistory[]
}
