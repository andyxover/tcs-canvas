'use server'

// Coursework mutations for the sandbox: create assignments (teacher), turn in
// work (student), grade submissions (teacher). Validation is intentionally
// light — there are no real users or data here. The graduation step swaps this
// for authenticated, RLS-backed server actions.

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createAssignment,
  gradeSubmission,
  gradeSubmissionWithRubric,
  getAssignment,
  getQuiz,
  getRubric,
  submitQuiz,
  turnInSubmission,
} from '@/lib/store'
import type { RubricScore } from '@/lib/types'

function str(fd: FormData, key: string): string {
  const v = fd.get(key)
  return typeof v === 'string' ? v.trim() : ''
}

function toIso(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export async function createAssignmentAction(courseId: string, fd: FormData): Promise<void> {
  const title = str(fd, 'title') || 'Untitled assignment'
  const points = Math.max(0, Math.min(1000, Number(str(fd, 'points')) || 0))
  const created = createAssignment({
    courseId,
    title,
    instructions: str(fd, 'instructions'),
    points,
    category: str(fd, 'category') || 'Assignments',
    dueAt: toIso(str(fd, 'dueAt')),
    published: fd.get('published') === 'on',
    rubricId: str(fd, 'rubricId') || null,
  })
  revalidatePath(`/courses/${courseId}/assignments`, 'page')
  redirect(`/courses/${courseId}/assignments/${created.id}`)
}

export async function turnInAction(courseId: string, assignmentId: string, studentId: string, fd: FormData): Promise<void> {
  const text = str(fd, 'text')
  const fileName = str(fd, 'fileName')
  turnInSubmission(assignmentId, studentId, {
    text,
    attachments: fileName ? [{ name: fileName, size: 152000 }] : [],
  })
  revalidatePath(`/courses/${courseId}/assignments/${assignmentId}`, 'page')
}

export async function gradeAction(courseId: string, assignmentId: string, studentId: string, fd: FormData): Promise<void> {
  const assignment = getAssignment(assignmentId)
  const feedback = str(fd, 'feedback')
  const rubric = assignment?.rubricId ? getRubric(assignment.rubricId) : undefined

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
      gradeSubmissionWithRubric(assignmentId, studentId, { rubricScores, feedback })
      revalidatePath(`/courses/${courseId}/assignments/${assignmentId}/submissions`, 'page')
      revalidatePath(`/courses/${courseId}/assignments/${assignmentId}`, 'page')
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
  gradeSubmission(assignmentId, studentId, { score, feedback })
  revalidatePath(`/courses/${courseId}/assignments/${assignmentId}/submissions`, 'page')
  revalidatePath(`/courses/${courseId}/assignments/${assignmentId}`, 'page')
}

export async function takeQuizAction(courseId: string, assignmentId: string, studentId: string, fd: FormData): Promise<void> {
  const quiz = getQuiz(assignmentId)
  if (!quiz) return
  // One answer per question, read positionally (q0, q1, …). Unanswered = -1.
  const answers = quiz.questions.map((_, i) => {
    const raw = str(fd, `q${i}`)
    const n = Number(raw)
    return raw !== '' && !Number.isNaN(n) ? n : -1
  })
  submitQuiz(assignmentId, studentId, answers)
  revalidatePath(`/courses/${courseId}/assignments/${assignmentId}`, 'page')
}
