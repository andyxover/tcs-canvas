'use server'

import { revalidatePath } from 'next/cache'
import { createAnnouncement } from '@/lib/store'

export async function createAnnouncementAction(courseId: string, authorId: string, fd: FormData): Promise<void> {
  const title = (fd.get('title') as string | null)?.trim() || 'Untitled'
  const body = (fd.get('body') as string | null)?.trim() || ''
  createAnnouncement({ courseId, authorId, title, body: body ? `<p>${escapeHtml(body)}</p>` : '' })
  revalidatePath(`/courses/${courseId}/announcements`, 'page')
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
