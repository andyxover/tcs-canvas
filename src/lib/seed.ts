// Deterministic seed for the LMS sandbox. Builds a small, believable school so
// every screen (gradebook, submissions, dashboard) has realistic data on first
// load. Submissions are generated from a stable hash of (student, assignment)
// so the same cells are graded / missing / pending on every restart.

import type { ProficiencyLevel } from './bc-curriculum'
import type {
  Announcement,
  Assignment,
  Course,
  CourseModule,
  DiscussionPost,
  DiscussionTopic,
  Enrollment,
  Guardianship,
  LmsData,
  Page,
  Person,
  Quiz,
  QuizQuestion,
  Rubric,
  Submission,
} from './types'

const DAY = 24 * 60 * 60 * 1000

function daysFromNow(n: number): string {
  return new Date(Date.now() + n * DAY).toISOString()
}

/** Stable 0..1 hash so the same cell always seeds the same way. */
function hash01(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 1000) / 1000
}

const teachers: Person[] = [
  { id: 't-rivera', name: 'Ms. Rivera', email: 'rivera@sandbox.tcs', color: '#0f766e' },
  { id: 't-tan', name: 'Mr. Tan', email: 'tan@sandbox.tcs', color: '#7c3aed' },
]

// Deliberately more than one child per guardian and more than one guardian per
// child, so the isolation tests exercise the real shape rather than a 1:1 map.
const guardians: Person[] = [
  { id: 'g-chen', name: 'Chen Wei-Ling', email: 'chen.family@sandbox.tcs', color: '#0f766e' },
  { id: 'g-novak', name: 'Marta Novak', email: 'novak.family@sandbox.tcs', color: '#7c3aed' },
  { id: 'g-wong', name: 'Wong Jia-Hao', email: 'wong.family@sandbox.tcs', color: '#b45309' },
]

const guardianships: Guardianship[] = [
  { guardianId: 'g-chen', studentId: 's-ava', relation: 'Mother', language: 'zh-TW' },
  { guardianId: 'g-novak', studentId: 's-ben', relation: 'Mother', language: 'en' },
  // Two children at the school, and one of them shares a guardian with nobody
  // else — the case a naive "first match" lookup gets wrong.
  { guardianId: 'g-wong', studentId: 's-emma', relation: 'Father', language: 'zh-TW' },
  { guardianId: 'g-wong', studentId: 's-frank', relation: 'Guardian', language: 'zh-TW' },
]

const students: Person[] = [
  { id: 's-ava', name: 'Ava Chen', email: 'ava@sandbox.tcs', color: '#e11d48' },
  { id: 's-ben', name: 'Ben Novak', email: 'ben@sandbox.tcs', color: '#2563eb' },
  { id: 's-chloe', name: 'Chloe Diaz', email: 'chloe@sandbox.tcs', color: '#d97706' },
  { id: 's-diego', name: 'Diego Santos', email: 'diego@sandbox.tcs', color: '#059669' },
  { id: 's-emma', name: 'Emma Wong', email: 'emma@sandbox.tcs', color: '#db2777' },
  { id: 's-frank', name: 'Frank Muller', email: 'frank@sandbox.tcs', color: '#4f46e5' },
]

const courses: Course[] = [
  {
    id: 'c-sci9',
    code: 'SCI 9',
    name: 'Science 9',
    term: 'Fall 2026',
    teacherId: 't-rivera',
    color: '#0f766e',
    syllabus:
      '<h2>Welcome to Science 9</h2><p>This year we explore matter, energy, and living systems through inquiry and hands-on labs. Bring curiosity and a lab notebook.</p><h3>How you are graded</h3><p>Homework 20% · Labs 30% · Quizzes 20% · Tests 30%. Late work loses 10% per day.</p>',
    published: true,
    curriculum: { subject: 'Science', grade: '9' },
    gradeSettings: {
      calc: 'weighted',
      showTotalsToStudents: true,
      categories: [
        { name: 'Homework', weight: 20 },
        { name: 'Labs', weight: 30 },
        { name: 'Quizzes', weight: 20 },
        { name: 'Tests', weight: 30 },
      ],
    },
  },
  {
    id: 'c-math9',
    code: 'MATH 9',
    name: 'Mathematics 9',
    term: 'Fall 2026',
    teacherId: 't-tan',
    color: '#7c3aed',
    syllabus:
      '<h2>Mathematics 9</h2><p>Algebraic reasoning, linear relations, and an introduction to proof. Practice daily — mathematics rewards repetition.</p>',
    published: true,
    curriculum: { subject: 'Mathematics', grade: '9' },
    gradeSettings: {
      calc: 'weighted',
      showTotalsToStudents: true,
      categories: [
        { name: 'Practice', weight: 25 },
        { name: 'Quizzes', weight: 25 },
        { name: 'Exams', weight: 50 },
      ],
    },
  },
  {
    id: 'c-chem11',
    code: 'CHEM 11',
    name: 'Chemistry 11',
    term: 'Fall 2026',
    teacherId: 't-rivera',
    color: '#b45309',
    syllabus:
      '<h2>Chemistry 11</h2><p>Atoms, moles, and reactions. A Graduation Program course — reported with letter grades and percentages, with the proficiency scale used formatively.</p>',
    published: true,
    curriculum: { subject: 'Chemistry', grade: '11' },
    gradeSettings: {
      calc: 'weighted',
      showTotalsToStudents: true,
      categories: [
        { name: 'Labs', weight: 30 },
        { name: 'Quizzes', weight: 20 },
        { name: 'Tests', weight: 50 },
      ],
    },
  },
]

const enrollments: Enrollment[] = students.flatMap((s) =>
  courses.map((c) => ({ courseId: c.id, studentId: s.id })),
)

const rubrics: Rubric[] = [
  {
    id: 'r-lab',
    courseId: 'c-sci9',
    title: 'Lab Report Rubric',
    criteria: [
      {
        id: 'r-lab-hyp',
        name: 'Hypothesis & Design',
        levels: [
          { label: 'Exemplary', points: 10, description: 'Testable hypothesis with controlled design.' },
          { label: 'Proficient', points: 8, description: 'Clear hypothesis, mostly controlled.' },
          { label: 'Developing', points: 5, description: 'Vague hypothesis or uncontrolled variables.' },
          { label: 'Beginning', points: 2, description: 'Missing or untestable hypothesis.' },
        ],
      },
      {
        id: 'r-lab-data',
        name: 'Data & Analysis',
        levels: [
          { label: 'Exemplary', points: 10, description: 'Accurate data, insightful analysis.' },
          { label: 'Proficient', points: 8, description: 'Accurate data, sound analysis.' },
          { label: 'Developing', points: 5, description: 'Some errors or thin analysis.' },
          { label: 'Beginning', points: 2, description: 'Data missing or unanalyzed.' },
        ],
      },
    ],
  },
]

// Assignment definitions per course. dueOffset in days relative to "now".
type AssignmentSeed = {
  id: string
  title: string
  category: string
  points: number
  dueOffset: number
  rubricId?: string
  standardIds?: string[]
  instructions: string
}

const sci9Assignments: AssignmentSeed[] = [
  { id: 'a-sci-hw1', title: 'Reading: States of Matter', category: 'Homework', points: 10, dueOffset: -18, standardIds: ['sci9-bi-2', 'sci9-co-5'], instructions: '<p>Read pp. 12–24 and answer the review questions.</p>' },
  { id: 'a-sci-lab1', title: 'Lab: Density of Solids', category: 'Labs', points: 20, dueOffset: -12, rubricId: 'r-lab', standardIds: ['sci9-cc-3', 'sci9-cc-4', 'sci9-cc-5', 'core-think-2'], instructions: '<p>Measure and calculate the density of three unknown solids. Submit a full lab report.</p>' },
  { id: 'a-sci-quiz1', title: 'Quiz: Particle Theory', category: 'Quizzes', points: 20, dueOffset: -8, standardIds: ['sci9-bi-2', 'sci9-co-6'], instructions: '<p>Short quiz on the particle theory of matter.</p>' },
  { id: 'a-sci-hw2', title: 'Worksheet: Phase Changes', category: 'Homework', points: 10, dueOffset: -4, standardIds: ['sci9-co-9'], instructions: '<p>Complete the phase-change worksheet.</p>' },
  { id: 'a-sci-lab2', title: 'Lab: Heating Curve of Water', category: 'Labs', points: 20, dueOffset: 3, rubricId: 'r-lab', standardIds: ['sci9-cc-5', 'sci9-cc-6', 'sci9-co-9', 'core-com-1'], instructions: '<p>Plot the heating curve of water and identify phase transitions.</p>' },
  { id: 'a-sci-test1', title: 'Unit Test: Matter', category: 'Tests', points: 50, dueOffset: 9, standardIds: ['sci9-bi-2', 'sci9-co-5', 'sci9-co-6', 'sci9-cc-7'], instructions: '<p>Unit test covering all of Unit 1.</p>' },
]

const math9Assignments: AssignmentSeed[] = [
  { id: 'a-math-p1', title: 'Practice Set 1: Integers', category: 'Practice', points: 10, dueOffset: -15, standardIds: ['ma9-bi-2', 'ma9-co-1'], instructions: '<p>Complete practice set 1.</p>' },
  { id: 'a-math-quiz1', title: 'Quiz: Order of Operations', category: 'Quizzes', points: 20, dueOffset: -9, standardIds: ['ma9-co-1', 'ma9-cc-2'], instructions: '<p>Quiz on order of operations.</p>' },
  { id: 'a-math-p2', title: 'Practice Set 2: Linear Equations', category: 'Practice', points: 10, dueOffset: -3, standardIds: ['ma9-bi-3', 'ma9-co-5', 'ma9-cc-4'], instructions: '<p>Complete practice set 2.</p>' },
  { id: 'a-math-exam1', title: 'Midterm Exam', category: 'Exams', points: 100, dueOffset: 7, standardIds: ['ma9-bi-2', 'ma9-bi-3', 'ma9-co-1', 'ma9-co-5', 'ma9-cc-6'], instructions: '<p>Covers integers through linear equations.</p>' },
]

const chem11Assignments: AssignmentSeed[] = [
  { id: 'a-chem-lab1', title: 'Lab: Flame Tests', category: 'Labs', points: 25, dueOffset: -10, standardIds: ['ch11-cc3', 'ch11-cc4', 'ch11-co2'], instructions: '<p>Identify metal ions by their characteristic flame colours.</p>' },
  { id: 'a-chem-quiz1', title: 'Quiz: Periodic Trends', category: 'Quizzes', points: 20, dueOffset: -5, standardIds: ['ch11-bi1', 'ch11-co3'], instructions: '<p>Quiz on atomic radius, ionization energy, and electronegativity.</p>' },
  { id: 'a-chem-lab2', title: 'Lab: Stoichiometry of a Precipitate', category: 'Labs', points: 25, dueOffset: 5, standardIds: ['ch11-bi4', 'ch11-co7', 'ch11-co8', 'core-think-2'], instructions: '<p>Determine percent yield from a precipitation reaction.</p>' },
  { id: 'a-chem-test1', title: 'Unit Test: The Mole', category: 'Tests', points: 60, dueOffset: 11, standardIds: ['ch11-bi4', 'ch11-co7', 'ch11-co8', 'ch11-cc7'], instructions: '<p>Covers the mole concept through stoichiometry.</p>' },
]

// A live, takeable quiz — future due date so students can sit it in the demo.
interface QuizSeed {
  id: string
  title: string
  category: string
  points: number
  dueOffset: number
  standardIds?: string[]
  questions: QuizQuestion[]
}

const sci9Quizzes: QuizSeed[] = [
  {
    id: 'a-sci-quiz2',
    title: 'Quiz: Lab Safety',
    category: 'Quizzes',
    points: 12,
    dueOffset: 4,
    standardIds: ['sci9-cc-3', 'core-ps-1'],
    questions: [
      { id: 'q1', prompt: 'Before starting any lab, the first thing you should do is…', kind: 'mc', options: ['Put on safety goggles', 'Taste the chemicals', 'Open every window', 'Turn off the lights'], correctIndex: 0 },
      { id: 'q2', prompt: 'Long hair must be tied back during a lab.', kind: 'tf', options: ['True', 'False'], correctIndex: 0 },
      { id: 'q3', prompt: 'If you spill a chemical, you should…', kind: 'mc', options: ['Ignore it', 'Tell the teacher immediately', 'Wipe it with your sleeve', 'Leave the room quietly'], correctIndex: 1 },
      { id: 'q4', prompt: 'It is safe to eat or drink at your lab station.', kind: 'tf', options: ['True', 'False'], correctIndex: 1 },
    ],
  },
]

function buildAssignments(): Assignment[] {
  const make = (courseId: string, seeds: AssignmentSeed[]): Assignment[] =>
    seeds.map((s, i) => ({
      id: s.id,
      courseId,
      title: s.title,
      instructions: s.instructions,
      points: s.points,
      category: s.category,
      dueAt: daysFromNow(s.dueOffset),
      published: true,
      submissionType: 'online' as const,
      rubricId: s.rubricId ?? null,
      standardIds: s.standardIds ?? [],
      // On for written work so the sandbox demonstrates it. A real deployment
      // should default this off and let teachers opt each task in.
      draftCoach: true,
      // Only on the two labs — work substantial enough that how it was written
      // is a fair question. Recording a ten-mark worksheet would not be.
      processCapture: s.id === 'a-sci-lab1' || s.id === 'a-sci-lab2',
      // The reading task is the one place in the seed where the English is the
      // point, so it demonstrates the refusal rather than only the happy path.
      languageIsAssessed: s.id === 'a-sci-hw1',
      position: i,
    }))
  const sci9 = make('c-sci9', sci9Assignments)
  const math9 = make('c-math9', math9Assignments)
  const chem11 = make('c-chem11', chem11Assignments)
  const sci9Q: Assignment[] = sci9Quizzes.map((q, i) => ({
    id: q.id,
    courseId: 'c-sci9',
    title: q.title,
    instructions: '<p>Answer every question. This quiz is graded automatically the moment you submit.</p>',
    points: q.points,
    category: q.category,
    dueAt: daysFromNow(q.dueOffset),
    published: true,
    submissionType: 'quiz' as const,
    rubricId: null,
    standardIds: q.standardIds ?? [],
    // A quiz has no draft to coach — it is answered and auto-graded on submit.
    draftCoach: false,
    processCapture: false,
    languageIsAssessed: false,
    position: sci9.length + i,
  }))
  return [...sci9, ...sci9Q, ...math9, ...chem11]
}

function buildQuizzes(): Quiz[] {
  return sci9Quizzes.map((q) => ({ assignmentId: q.id, questions: q.questions }))
}

function buildSubmissions(assignments: Assignment[]): Submission[] {
  const out: Submission[] = []
  for (const a of assignments) {
    const isPast = a.dueAt != null && new Date(a.dueAt).getTime() < Date.now()
    for (const s of students) {
      const roll = hash01(`${s.id}:${a.id}`)
      // Future assignments: nobody has submitted yet.
      if (!isPast) {
        out.push(base(a.id, s.id, 'unsubmitted', null, null))
        continue
      }
      // Past assignments: ~15% missing, ~15% submitted-not-graded, rest graded.
      if (roll < 0.15) {
        out.push(base(a.id, s.id, 'unsubmitted', null, null))
      } else if (roll < 0.3) {
        out.push(base(a.id, s.id, 'submitted', daysFromNow(offsetForDue(a) + 0.2), null))
      } else {
        // Score band 60–100% skewed high, stable per cell.
        const pct = 0.6 + hash01(`score:${s.id}:${a.id}`) * 0.4
        const score = Math.round(a.points * pct)
        const sub = base(a.id, s.id, 'graded', daysFromNow(offsetForDue(a) - 0.5), score)
        // Proficiency judgements track the score band, so the mastery grid has
        // believable data on first load.
        const level: ProficiencyLevel =
          pct >= 0.93 ? 'extending' : pct >= 0.78 ? 'proficient' : pct >= 0.68 ? 'developing' : 'emerging'
        sub.standardAssessments = (a.standardIds ?? []).map((standardId) => ({ standardId, level }))
        out.push(sub)
      }
    }
  }
  return out
}

function offsetForDue(a: Assignment): number {
  if (!a.dueAt) return -1
  return (new Date(a.dueAt).getTime() - Date.now()) / DAY
}

function base(
  assignmentId: string,
  studentId: string,
  state: Submission['state'],
  submittedAt: string | null,
  score: number | null,
): Submission {
  return {
    id: `sub-${assignmentId}-${studentId}`,
    assignmentId,
    studentId,
    state,
    submittedAt,
    text: state === 'unsubmitted' ? '' : 'Submitted through the sandbox.',
    attachments: state === 'unsubmitted' ? [] : [{ name: 'work.pdf', size: 184320 }],
    score,
    feedback: '',
    rubricScores: [],
    standardAssessments: [],
    answers: [],
  }
}

const modules: CourseModule[] = [
  {
    id: 'm-sci-1',
    courseId: 'c-sci9',
    name: 'Unit 1 — The Nature of Matter',
    position: 0,
    published: true,
    items: [
      { id: 'mi-1', kind: 'page', title: 'Unit Overview', refId: 'p-sci-overview', url: null, position: 0 },
      { id: 'mi-2', kind: 'assignment', title: 'Reading: States of Matter', refId: 'a-sci-hw1', url: null, position: 1 },
      { id: 'mi-3', kind: 'assignment', title: 'Lab: Density of Solids', refId: 'a-sci-lab1', url: null, position: 2 },
      { id: 'mi-4', kind: 'assignment', title: 'Quiz: Particle Theory', refId: 'a-sci-quiz1', url: null, position: 3 },
      { id: 'mi-5', kind: 'link', title: 'PhET: States of Matter (simulation)', refId: null, url: 'https://phet.colorado.edu', position: 4 },
    ],
  },
  {
    id: 'm-sci-2',
    courseId: 'c-sci9',
    name: 'Unit 1 — Phase Changes & Energy',
    position: 1,
    published: true,
    items: [
      { id: 'mi-6', kind: 'assignment', title: 'Worksheet: Phase Changes', refId: 'a-sci-hw2', url: null, position: 0 },
      { id: 'mi-7', kind: 'assignment', title: 'Lab: Heating Curve of Water', refId: 'a-sci-lab2', url: null, position: 1 },
      { id: 'mi-8', kind: 'assignment', title: 'Unit Test: Matter', refId: 'a-sci-test1', url: null, position: 2 },
    ],
  },
  {
    id: 'm-math-1',
    courseId: 'c-math9',
    name: 'Module 1 — Number Sense',
    position: 0,
    published: true,
    items: [
      { id: 'mi-9', kind: 'assignment', title: 'Practice Set 1: Integers', refId: 'a-math-p1', url: null, position: 0 },
      { id: 'mi-10', kind: 'assignment', title: 'Quiz: Order of Operations', refId: 'a-math-quiz1', url: null, position: 1 },
    ],
  },
]

const pages: Page[] = [
  {
    id: 'p-sci-overview',
    courseId: 'c-sci9',
    title: 'Unit Overview',
    body: '<h2>Unit 1 — The Nature of Matter</h2><p>In this unit you will investigate what everything is made of. By the end you should be able to explain the particle theory of matter, classify substances, and describe phase changes in terms of energy.</p><ul><li>Particle theory of matter</li><li>Physical vs. chemical properties</li><li>Phase changes and the heating curve</li></ul>',
  },
]

const announcements: Announcement[] = [
  {
    id: 'an-1',
    courseId: 'c-sci9',
    authorId: 't-rivera',
    title: 'Bring safety goggles Thursday',
    body: '<p>We are running the density lab on Thursday. Please bring your safety goggles and a pencil for your lab notebook.</p>',
    postedAt: daysFromNow(-2),
  },
  {
    id: 'an-2',
    courseId: 'c-sci9',
    authorId: 't-rivera',
    title: 'Unit test moved to next week',
    body: '<p>By popular request the Unit 1 test is now next Wednesday. Use the extra weekend to review the heating-curve notes.</p>',
    postedAt: daysFromNow(-5),
  },
]

const discussionTopics: DiscussionTopic[] = [
  {
    id: 'dt-1',
    courseId: 'c-sci9',
    authorId: 't-rivera',
    title: 'Where do you see phase changes in daily life?',
    body: '<p>Post one everyday example of a phase change and say which transition it is (e.g. melting, condensation). Reply to at least one classmate.</p>',
    postedAt: daysFromNow(-3),
  },
]

const discussionPosts: DiscussionPost[] = [
  { id: 'dp-1', topicId: 'dt-1', authorId: 's-ava', body: 'Fog on a cold window in the morning — condensation!', postedAt: daysFromNow(-2), parentId: null },
  { id: 'dp-2', topicId: 'dt-1', authorId: 's-diego', body: 'Dry ice at the school play — sublimation.', postedAt: daysFromNow(-2), parentId: null },
  { id: 'dp-3', topicId: 'dt-1', authorId: 's-emma', body: 'Nice one Diego, I always forget sublimation skips liquid.', postedAt: daysFromNow(-1), parentId: 'dp-2' },
]

export function buildSeed(): LmsData {
  const assignments = buildAssignments()
  const submissions = buildSubmissions(assignments)
  return {
    teachers,
    students,
    guardians,
    guardianships,
    courses,
    enrollments,
    modules,
    pages,
    assignments,
    submissions,
    quizzes: buildQuizzes(),
    rubrics,
    announcements,
    discussionTopics,
    discussionPosts,
    // Teachers write these; nothing is seeded so the first draft is always
    // generated from real evidence rather than from a fixture.
    reportComments: [],
    coachRequests: [],
    practiceFlags: [],
    writingHistories: [],
  }
}
