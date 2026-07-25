'use server'

import { revalidatePath } from 'next/cache'
import { createAnnouncement, deleteAnnouncement } from '@/lib/store'

export async function createAnnouncementAction(courseId: string, authorId: string, fd: FormData): Promise<void> {
  const title = (fd.get('title') as string | null)?.trim() || 'Untitled'
  // Trusted sandbox HTML from the rich-text editor (rendered via RichText).
  const body = (fd.get('body') as string | null)?.trim() || ''
  await createAnnouncement({ courseId, authorId, title, body })
  revalidatePath(`/lms/courses/${courseId}/announcements`, 'page')
}

export async function deleteAnnouncementAction(courseId: string, announcementId: string): Promise<void> {
  await deleteAnnouncement(announcementId)
  revalidatePath(`/lms/courses/${courseId}/announcements`, 'page')
}
