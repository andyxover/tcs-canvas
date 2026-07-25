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
  // Guardians have exactly one surface, /lms/family. Course pages carry other
  // families' children — the roster, the gradebook, discussion threads — so the
  // lockout is here at the shared entry point rather than repeated per page,
  // where one omission would be a leak.
  if (viewer.kind === 'guardian') notFound()
  return { course, viewer, isTeacher: viewer.kind === 'teacher' }
}
