'use server'

import { revalidatePath } from 'next/cache'
import { clearReportComment, saveReportComment } from '@/lib/store'

export async function saveCommentAction(
  courseId: string,
  studentId: string,
  fd: FormData,
): Promise<void> {
  const body = ((fd.get('body') as string | null) ?? '').trim()
  const draft = ((fd.get('draft') as string | null) ?? '').trim()
  const drafterId = ((fd.get('drafterId') as string | null) ?? 'structured').trim()
  if (!body) {
    // An empty box means "discard what I had", not "save nothing".
    await clearReportComment(courseId, studentId)
  } else {
    await saveReportComment({ courseId, studentId, body, draft, drafterId })
  }
  revalidatePath(`/lms/courses/${courseId}/reports`, 'page')
}

export async function discardCommentAction(courseId: string, studentId: string): Promise<void> {
  await clearReportComment(courseId, studentId)
  revalidatePath(`/lms/courses/${courseId}/reports`, 'page')
}
