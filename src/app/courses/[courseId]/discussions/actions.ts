'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { addDiscussionPost, createDiscussionTopic } from '@/lib/store'

function str(fd: FormData, key: string): string {
  const v = fd.get(key)
  return typeof v === 'string' ? v.trim() : ''
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function createTopicAction(courseId: string, authorId: string, fd: FormData): Promise<void> {
  const title = str(fd, 'title') || 'Untitled topic'
  const body = str(fd, 'body')
  const topic = createDiscussionTopic({ courseId, authorId, title, body: body ? `<p>${escapeHtml(body)}</p>` : '' })
  revalidatePath(`/courses/${courseId}/discussions`, 'page')
  redirect(`/courses/${courseId}/discussions/${topic.id}`)
}

export async function addPostAction(courseId: string, topicId: string, authorId: string, fd: FormData): Promise<void> {
  const body = str(fd, 'body')
  const parentId = str(fd, 'parentId') || null
  if (body) addDiscussionPost({ topicId, authorId, body, parentId })
  revalidatePath(`/courses/${courseId}/discussions/${topicId}`, 'page')
}
