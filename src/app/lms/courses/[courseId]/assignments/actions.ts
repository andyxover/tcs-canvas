'use server'

// Coursework mutations for the sandbox: create assignments (teacher), turn in
// work (student), grade submissions (teacher). Validation is intentionally
// light — there are no real users or data here. The graduation step swaps this
// for authenticated, RLS-backed server actions.

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  assessStandards,
  createAssignment,
  createQuizAssignment,
  deleteAssignment,
  gradeSubmission,
  gradeSubmissionWithRubric,
  getAssignment,
  getQuiz,
  getRubric,
  submitQuiz,
  turnInSubmission,
  updateAssignment,
  updateQuiz,
} from '@/lib/store'
import { PROFICIENCY_LEVELS, type ProficiencyLevel } from '@/lib/bc-curriculum'
import type { QuizQuestion, RubricScore, StandardAssessment } from '@/lib/types'

function str(fd: FormData, key: string): string {
  const v = fd.get(key)
  return typeof v === 'string' ? v.trim() : ''
}

function standardIds(fd: FormData): string[] {
  return fd.getAll('standardIds').filter((v): v is string => typeof v === 'string')
}

function toIso(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export async function createAssignmentAction(courseId: string, fd: FormData): Promise<void> {
  const title = str(fd, 'title') || 'Untitled assignment'
  const points = Math.max(0, Math.min(1000, Number(str(fd, 'points')) || 0))
  const created = await createAssignment({
    courseId,
    title,
    instructions: str(fd, 'instructions'),
    points,
    category: str(fd, 'category') || 'Assignments',
    dueAt: toIso(str(fd, 'dueAt')),
    published: fd.get('published') === 'on',
    rubricId: str(fd, 'rubricId') || null,
    standardIds: standardIds(fd),
    draftCoach: fd.get('draftCoach') === 'on',
    processCapture: fd.get('processCapture') === 'on',
  })
  revalidatePath(`/lms/courses/${courseId}/assignments`, 'page')
  redirect(`/lms/courses/${courseId}/assignments/${created.id}`)
}

function parseQuizQuestions(fd: FormData): QuizQuestion[] {
  const qCount = Math.max(0, Number(str(fd, 'qCount')) || 0)
  const questions: QuizQuestion[] = []
  for (let i = 0; i < qCount; i++) {
    const prompt = str(fd, `q-${i}-prompt`)
    if (!prompt) continue
    const kind = str(fd, `q-${i}-kind`) === 'tf' ? 'tf' : 'mc'
    let options: string[]
    if (kind === 'tf') {
      options = ['True', 'False']
    } else {
      const optCount = Math.max(2, Number(str(fd, `q-${i}-optCount`)) || 0)
      options = []
      for (let j = 0; j < optCount; j++) {
        const o = str(fd, `q-${i}-opt-${j}`)
        if (o) options.push(o)
      }
      if (options.length < 2) continue
    }
    const correctIndex = Math.min(options.length - 1, Math.max(0, Number(str(fd, `q-${i}-correct`)) || 0))
    questions.push({ id: `q${i}`, prompt, kind, options, correctIndex })
  }
  return questions
}

export async function createQuizAction(courseId: string, fd: FormData): Promise<void> {
  const questions = parseQuizQuestions(fd)
  const points = Math.max(0, Math.min(1000, Number(str(fd, 'points')) || questions.length))
  const created = await createQuizAssignment({
    courseId,
    title: str(fd, 'title') || 'Untitled quiz',
    instructions: str(fd, 'instructions'),
    points,
    category: str(fd, 'category') || 'Quizzes',
    dueAt: toIso(str(fd, 'dueAt')),
    published: fd.get('published') === 'on',
    questions,
    standardIds: standardIds(fd),
  })
  revalidatePath(`/lms/courses/${courseId}/assignments`, 'page')
  redirect(`/lms/courses/${courseId}/assignments/${created.id}`)
}

export async function updateQuizAction(courseId: string, assignmentId: string, fd: FormData): Promise<void> {
  const questions = parseQuizQuestions(fd)
  const points = Math.max(0, Math.min(1000, Number(str(fd, 'points')) || questions.length))
  await updateQuiz(assignmentId, {
    title: str(fd, 'title') || 'Untitled quiz',
    instructions: str(fd, 'instructions'),
    points,
    category: str(fd, 'category') || 'Quizzes',
    dueAt: toIso(str(fd, 'dueAt')),
    published: fd.get('published') === 'on',
    questions,
    standardIds: standardIds(fd),
  })
  revalidatePath(`/lms/courses/${courseId}/assignments/${assignmentId}`, 'page')
  redirect(`/lms/courses/${courseId}/assignments/${assignmentId}`)
}

export async function updateAssignmentAction(courseId: string, assignmentId: string, fd: FormData): Promise<void> {
  const points = Math.max(0, Math.min(1000, Number(str(fd, 'points')) || 0))
  await updateAssignment(assignmentId, {
    title: str(fd, 'title') || 'Untitled assignment',
    instructions: str(fd, 'instructions'),
    points,
    category: str(fd, 'category') || 'Assignments',
    dueAt: toIso(str(fd, 'dueAt')),
    published: fd.get('published') === 'on',
    rubricId: str(fd, 'rubricId') || null,
    standardIds: standardIds(fd),
    draftCoach: fd.get('draftCoach') === 'on',
    processCapture: fd.get('processCapture') === 'on',
  })
  revalidatePath(`/lms/courses/${courseId}/assignments/${assignmentId}`, 'page')
  redirect(`/lms/courses/${courseId}/assignments/${assignmentId}`)
}

export async function deleteAssignmentAction(courseId: string, assignmentId: string): Promise<void> {
  await deleteAssignment(assignmentId)
  revalidatePath(`/lms/courses/${courseId}/assignments`, 'page')
  redirect(`/lms/courses/${courseId}/assignments`)
}

export async function turnInAction(courseId: string, assignmentId: string, studentId: string, fd: FormData): Promise<void> {
  const text = str(fd, 'text')
  const fileName = str(fd, 'fileName')
  await turnInSubmission(assignmentId, studentId, {
    text,
    attachments: fileName ? [{ name: fileName, size: 152000 }] : [],
  })
  revalidatePath(`/lms/courses/${courseId}/assignments/${assignmentId}`, 'page')
}

export async function gradeAction(courseId: string, assignmentId: string, studentId: string, fd: FormData): Promise<void> {
  const assignment = await getAssignment(assignmentId)
  const feedback = str(fd, 'feedback')
  const rubric = assignment?.rubricId ? await getRubric(assignment.rubricId) : undefined

  // BC proficiency judgements, one per attached standard (blank = not assessed).
  const assessments: StandardAssessment[] = []
  for (const sid of assignment?.standardIds ?? []) {
    const raw = str(fd, `std-${sid}`)
    if (PROFICIENCY_LEVELS.includes(raw as ProficiencyLevel)) {
      assessments.push({ standardId: sid, level: raw as ProficiencyLevel })
    }
  }
  if ((assignment?.standardIds ?? []).length > 0) {
    await assessStandards(assignmentId, studentId, assessments)
  }

  // Rubric path: score is the sum of the selected level points per criterion.
  if (rubric) {
    const rubricScores: RubricScore[] = []
    for (const c of rubric.criteria) {
      const raw = str(fd, `crit-${c.id}`)
      if (raw !== '') {
        const pts = Number(raw)
        if (!Number.isNaN(pts)) rubricScores.push({ criterionId: c.id, points: pts })
      }
    }
    if (rubricScores.length > 0) {
      await gradeSubmissionWithRubric(assignmentId, studentId, { rubricScores, feedback })
      revalidatePath(`/lms/courses/${courseId}/assignments/${assignmentId}/submissions`, 'page')
      revalidatePath(`/lms/courses/${courseId}/assignments/${assignmentId}`, 'page')
      return
    }
  }

  // Plain points path.
  const raw = str(fd, 'score')
  let score: number | null = null
  if (raw !== '') {
    const n = Number(raw)
    if (!Number.isNaN(n)) score = Math.max(0, Math.min(assignment?.points ?? n, n))
  }
  await gradeSubmission(assignmentId, studentId, { score, feedback })
  revalidatePath(`/lms/courses/${courseId}/assignments/${assignmentId}/submissions`, 'page')
  revalidatePath(`/lms/courses/${courseId}/assignments/${assignmentId}`, 'page')
}

export async function takeQuizAction(courseId: string, assignmentId: string, studentId: string, fd: FormData): Promise<void> {
  const quiz = await getQuiz(assignmentId)
  if (!quiz) return
  // One answer per question, read positionally (q0, q1, …). Unanswered = -1.
  const answers = quiz.questions.map((_, i) => {
    const raw = str(fd, `q${i}`)
    const n = Number(raw)
    return raw !== '' && !Number.isNaN(n) ? n : -1
  })
  await submitQuiz(assignmentId, studentId, answers)
  revalidatePath(`/lms/courses/${courseId}/assignments/${assignmentId}`, 'page')
}
