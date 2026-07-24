'use server'

// Coursework mutations for the sandbox: create assignments (teacher), turn in
// work (student), grade submissions (teacher). Validation is intentionally
// light — there are no real users or data here. The graduation step swaps this
// for authenticated, RLS-backed server actions.

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAssignment, gradeSubmission, getAssignment, turnInSubmission } from '@/lib/store'

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
  const raw = str(fd, 'score')
  let score: number | null = null
  if (raw !== '') {
    const n = Number(raw)
    if (!Number.isNaN(n)) score = Math.max(0, Math.min(assignment?.points ?? n, n))
  }
  gradeSubmission(assignmentId, studentId, { score, feedback: str(fd, 'feedback') })
  revalidatePath(`/courses/${courseId}/assignments/${assignmentId}/submissions`, 'page')
  revalidatePath(`/courses/${courseId}/assignments/${assignmentId}`, 'page')
}
