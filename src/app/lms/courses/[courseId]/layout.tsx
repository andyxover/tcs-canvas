import { notFound } from 'next/navigation'
import { getCourse } from '@/lib/store'
import { getViewer } from '@/lib/session'
import { CourseNav } from './_components/CourseNav'

export const dynamic = 'force-dynamic'

export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const course = await getCourse(courseId)
  if (!course) notFound()
  const viewer = await getViewer()
  // The chokepoint: this layout wraps every course route, including the ones
  // that resolve their own viewer rather than going through courseCtx. A
  // guardian has no business on any of them.
  if (viewer.kind === 'guardian') notFound()

  return (
    <div className="lms-shell">
      <CourseNav
        courseId={course.id}
        courseName={course.name}
        courseCode={course.code}
        term={course.term}
        isTeacher={viewer.kind === 'teacher'}
      />
      <div className="lms-content">{children}</div>
    </div>
  )
}
