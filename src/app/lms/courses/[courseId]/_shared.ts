import { notFound } from 'next/navigation'
import { getViewer, type Viewer } from '@/lib/session'
import { getCourse } from '@/lib/store'
import type { Course } from '@/lib/types'

export interface CourseContext {
  course: Course
  viewer: Viewer
  isTeacher: boolean
}

/** Resolve the course + current viewer for a course page, or 404. */
export async function courseCtx(params: Promise<{ courseId: string }>): Promise<CourseContext> {
  const { courseId } = await params
  const course = await getCourse(courseId)
  if (!course) notFound()
  const viewer = await getViewer()
  return { course, viewer, isTeacher: viewer.kind === 'teacher' }
}
