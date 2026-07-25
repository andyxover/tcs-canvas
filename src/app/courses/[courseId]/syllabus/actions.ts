'use server'

import { revalidatePath } from 'next/cache'
import { updateCourseSyllabus } from '@/lib/store'

export async function saveSyllabusAction(courseId: string, fd: FormData): Promise<void> {
  // Trusted sandbox HTML from the rich-text editor (rendered via RichText).
  const syllabus = (fd.get('syllabus') as string | null)?.trim() || ''
  await updateCourseSyllabus(courseId, syllabus)
  revalidatePath(`/courses/${courseId}/syllabus`, 'page')
}
