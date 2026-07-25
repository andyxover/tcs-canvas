import Link from 'next/link'
import { getViewer } from '@/lib/session'
import { agendaForCourses, courseGradeForStudent, getAssignment, getPerson, getSubmission, listCoursesForStudent, listCoursesForTeacher, listRoster, studentMissingCount, teacherGradingQueue, todayLabel } from '@/lib/store'
import { isMissing } from '@/lib/grade-calc'
import type { Course } from '@/lib/types'
import { Avatar, Badge, EmptyState, fmtDay } from './_components/ui'
import { HoverLink } from './_components/interactive'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const viewer = await getViewer()
  const isTeacher = viewer.kind === 'teacher'
  const courses = isTeacher
    ? await listCoursesForTeacher(viewer.person.id)
    : await listCoursesForStudent(viewer.person.id)

  return (
    <main className="lms-page">
      <div className="lms-header">
        <div>
          <span className="lms-eyebrow">{await todayLabel()}</span>
          <h1 className="lms-display">
            {isTeacher ? `Good day, ${viewer.person.name}` : `Hi, ${viewer.person.name.split(' ')[0]}`}
          </h1>
          <p className="lms-sub">
            {isTeacher ? 'Here’s what needs your attention.' : 'Here’s what’s on your plate.'}
          </p>
        </div>
      </div>

      {courses.length === 0 ? (
        <EmptyState icon="📚" title="No courses yet" hint="Switch to another user from the top-right menu." />
      ) : (
        <div className="lms-dash">
          <div className="lms-dash__main">
            {isTeacher ? (
              <GradingQueue teacherId={viewer.person.id} />
            ) : (
              <StudentTodo studentId={viewer.person.id} courseIds={courses.map((c) => c.id)} />
            )}
          </div>
          <aside className="lms-dash__side">
            <div className="lms-between" style={{ marginBottom: 12 }}>
              <h2 className="lms-dash__h2">Your courses</h2>
              <span className="lms-faint" style={{ fontSize: 12.5 }}>{courses.length}</span>
            </div>
            <div className="lms-dash__courses">
              {courses.map((course) =>
                isTeacher ? (
                  <TeacherCourseCard key={course.id} course={course} />
                ) : (
                  <StudentCourseCard key={course.id} course={course} studentId={viewer.person.id} />
                ),
              )}
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}

// ---- Teacher: needs-grading queue --------------------------------------

async function GradingQueue({ teacherId }: { teacherId: string }) {
  const { entries, total } = await teacherGradingQueue(teacherId)
  const withWork = entries.filter((e) => e.toGrade > 0)

  return (
    <section className="lms-card lms-card--pad">
      <div className="lms-between" style={{ marginBottom: 4 }}>
        <h2 className="lms-dash__h2">Needs grading</h2>
        {total > 0 && <Badge tone="warn">{total} to grade</Badge>}
      </div>

      {total === 0 ? (
        <div className="lms-hub-empty">
          <span style={{ fontSize: 26 }} aria-hidden>✅</span>
          <div>
            <div style={{ fontWeight: 600 }}>All caught up</div>
            <div className="lms-muted" style={{ fontSize: 13 }}>No submissions waiting for a grade.</div>
          </div>
        </div>
      ) : (
        <div className="lms-stack" style={{ gap: 8, marginTop: 10 }}>
          {withWork.map((e) => (
            <HoverLink key={e.courseId} href={`/courses/${e.courseId}/assignments`} className="lms-hub-row">
              <span aria-hidden className="lms-hub-row__accent" style={{ background: e.courseColor }} />
              <span className="lms-hub-row__title">{e.courseName}</span>
              <Badge tone="warn">{e.toGrade}</Badge>
            </HoverLink>
          ))}
        </div>
      )}
    </section>
  )
}

// ---- Student: to-do ----------------------------------------------------

async function StudentTodo({ studentId, courseIds }: { studentId: string; courseIds: string[] }) {
  const upcoming = (
    await Promise.all(
      (await agendaForCourses(courseIds, 14)).map(async (e) => {
        const sub = await getSubmission(e.assignmentId, studentId)
        const a = await getAssignment(e.assignmentId)
        const status =
          sub.state === 'graded'
            ? 'graded'
            : sub.state === 'submitted'
              ? 'submitted'
              : a && isMissing(a, sub)
                ? 'missing'
                : 'todo'
        return { ...e, status }
      }),
    )
  )
    .filter((x) => x.status !== 'graded')
    .slice(0, 6)

  const missing = await studentMissingCount(studentId)
  const dueSoon = upcoming.filter((x) => x.status === 'todo' || x.status === 'missing').length

  return (
    <section className="lms-card lms-card--pad">
      <div className="lms-between" style={{ marginBottom: 10 }}>
        <h2 className="lms-dash__h2">To do</h2>
        <Link href="/agenda" className="lms-btn lms-btn--ghost lms-btn--sm">
          Full agenda →
        </Link>
      </div>

      <div className="lms-flex lms-wrap lms-gap-sm" style={{ marginBottom: 12 }}>
        {dueSoon > 0 && <Badge tone="info">{dueSoon} coming up</Badge>}
        {missing > 0 && <Badge tone="danger">{missing} missing</Badge>}
        {dueSoon === 0 && missing === 0 && <Badge tone="ok">All clear 🎉</Badge>}
      </div>

      {upcoming.length === 0 ? (
        <div className="lms-hub-empty">
          <span style={{ fontSize: 26 }} aria-hidden>🎉</span>
          <div>
            <div style={{ fontWeight: 600 }}>Nothing due soon</div>
            <div className="lms-muted" style={{ fontSize: 13 }}>You’re all caught up for the next two weeks.</div>
          </div>
        </div>
      ) : (
        <div className="lms-stack" style={{ gap: 8 }}>
          {upcoming.map((x) => (
            <HoverLink key={x.assignmentId} href={`/courses/${x.courseId}/assignments/${x.assignmentId}`} className="lms-hub-row">
              <span aria-hidden className="lms-hub-row__accent" style={{ background: x.courseColor }} />
              <div className="lms-hub-row__main">
                <div className="lms-hub-row__title">
                  {x.title}
                  {x.isQuiz && <span style={{ marginLeft: 6 }}><Badge tone="info">Quiz</Badge></span>}
                </div>
                <div className="lms-row__meta">
                  {x.courseName} · due {fmtDay(x.dueAt)}
                </div>
              </div>
              <TodoTag status={x.status} />
            </HoverLink>
          ))}
        </div>
      )}
    </section>
  )
}

function TodoTag({ status }: { status: string }) {
  if (status === 'submitted') return <Badge tone="info">Submitted</Badge>
  if (status === 'missing') return <Badge tone="danger">Missing</Badge>
  return <Badge tone="muted">To do</Badge>
}

// ---- Course cards ------------------------------------------------------

async function TeacherCourseCard({ course }: { course: Course }) {
  const roster = await listRoster(course.id)
  return (
    <Link href={`/courses/${course.id}`} className="lms-minicard">
      <span aria-hidden className="lms-minicard__swatch" style={{ background: course.color }} />
      <div className="lms-minicard__body">
        <div className="lms-minicard__name">{course.name}</div>
        <div className="lms-minicard__meta">
          {course.code} · {roster.length} students
        </div>
      </div>
    </Link>
  )
}

async function StudentCourseCard({ course, studentId }: { course: Course; studentId: string }) {
  const teacher = await getPerson(course.teacherId)
  const grade = await courseGradeForStudent(course.id, studentId)
  const showGrade = course.gradeSettings.showTotalsToStudents && grade.pct != null
  return (
    <Link href={`/courses/${course.id}`} className="lms-minicard">
      <span aria-hidden className="lms-minicard__swatch" style={{ background: course.color }} />
      <div className="lms-minicard__body">
        <div className="lms-minicard__name">{course.name}</div>
        <div className="lms-minicard__meta lms-flex" style={{ gap: 6 }}>
          {teacher && <Avatar person={teacher} size={16} />}
          <span>{teacher?.name}</span>
        </div>
      </div>
      {showGrade && (
        <Badge tone="info">
          {grade.pct}%
        </Badge>
      )}
    </Link>
  )
}
