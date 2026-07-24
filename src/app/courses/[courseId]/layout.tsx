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
  const course = getCourse(courseId)
  if (!course) notFound()
  const viewer = await getViewer()

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
