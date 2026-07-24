import Link from 'next/link'
import { getViewer } from '@/lib/session'
import {
  courseGradeForStudent,
  getPerson,
  listCoursesForStudent,
  listCoursesForTeacher,
  listRoster,
} from '@/lib/store'
import type { Course } from '@/lib/types'
import { Badge, EmptyState } from './_components/ui'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const viewer = await getViewer()
  const isTeacher = viewer.kind === 'teacher'
  const courses = isTeacher
    ? listCoursesForTeacher(viewer.person.id)
    : listCoursesForStudent(viewer.person.id)

  return (
    <main className="lms-page">
      <div className="lms-header">
        <div>
          <h1 className="lms-h1">
            {isTeacher ? 'Your courses' : `Hi, ${viewer.person.name.split(' ')[0]}`}
          </h1>
          <p className="lms-sub">
            {isTeacher
              ? 'Courses you teach this term.'
              : 'Courses you are enrolled in this term.'}
          </p>
        </div>
      </div>

      {courses.length === 0 ? (
        <EmptyState icon="📚" title="No courses yet" hint="Switch to another user from the top-right menu." />
      ) : (
        <div className="lms-courses">
          {courses.map((course) =>
            isTeacher ? (
              <TeacherCourseCard key={course.id} course={course} />
            ) : (
              <StudentCourseCard key={course.id} course={course} studentId={viewer.person.id} />
            ),
          )}
        </div>
      )}
    </main>
  )
}

function TeacherCourseCard({ course }: { course: Course }) {
  const roster = listRoster(course.id)
  return (
    <Link href={`/courses/${course.id}`} className="lms-course-card">
      <div className="lms-course-card__banner" style={{ background: bannerGradient(course.color) }} />
      <div className="lms-course-card__body">
        <div className="lms-course-card__code">{course.code}</div>
        <div className="lms-course-card__name">{course.name}</div>
        <div className="lms-course-card__meta">
          <span>{course.term}</span>
          <span aria-hidden>·</span>
          <span>{roster.length} students</span>
        </div>
      </div>
    </Link>
  )
}

function StudentCourseCard({ course, studentId }: { course: Course; studentId: string }) {
  const teacher = getPerson(course.teacherId)
  const grade = courseGradeForStudent(course.id, studentId)
  const showGrade = course.gradeSettings.showTotalsToStudents && grade.pct != null
  return (
    <Link href={`/courses/${course.id}`} className="lms-course-card">
      <div className="lms-course-card__banner" style={{ background: bannerGradient(course.color) }} />
      <div className="lms-course-card__body">
        <div className="lms-course-card__code">{course.code}</div>
        <div className="lms-course-card__name">{course.name}</div>
        <div className="lms-course-card__meta lms-between">
          <span>{teacher?.name}</span>
          {showGrade ? (
            <Badge tone="info">
              {grade.pct}% · {grade.letter}
            </Badge>
          ) : (
            <span className="lms-faint">—</span>
          )}
        </div>
      </div>
    </Link>
  )
}

function bannerGradient(color: string): string {
  return `linear-gradient(135deg, ${color}, ${color}cc)`
}
