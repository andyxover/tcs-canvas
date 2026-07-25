import Link from 'next/link'
import {
  courseGradeForStudent,
  getPerson,
  getSubmission,
  listAnnouncements,
  listAssignments,
  listRoster,
  listUpcomingAssignments,
} from '@/lib/store'
import { isMissing } from '@/lib/grade-calc'
import { courseCtx } from './_shared'
import { Avatar, Badge, fmtDay, fmtRelative } from '../../_components/ui'
import { HoverLink } from '../../_components/interactive'

export const dynamic = 'force-dynamic'

export default async function CourseHomePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { course, viewer, isTeacher } = await courseCtx(params)
  const teacher = await getPerson(course.teacherId)
  const announcements = (await listAnnouncements(course.id)).slice(0, 2)

  return (
    <div className="lms-stack">
      <div className="lms-header">
        <div>
          <div className="lms-course-card__code">{course.code}</div>
          <h1 className="lms-h1">{course.name}</h1>
          <div className="lms-flex lms-muted" style={{ fontSize: 13 }}>
            {teacher && <Avatar person={teacher} size={22} />}
            <span>{teacher?.name}</span>
            <span aria-hidden>·</span>
            <span>{course.term}</span>
          </div>
        </div>
      </div>

      {announcements.length > 0 && (
        <section>
          <SectionTitle href={`/courses/${course.id}/announcements`}>Latest announcements</SectionTitle>
          <div className="lms-list">
            {announcements.map((a) => (
              <div key={a.id} className="lms-row">
                <div className="lms-row__icon" aria-hidden>
                  📣
                </div>
                <div className="lms-row__main">
                  <div className="lms-row__title">{a.title}</div>
                  <div className="lms-row__meta">{fmtRelative(a.postedAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isTeacher ? (
        <TeacherOverview courseId={course.id} />
      ) : (
        <StudentOverview courseId={course.id} studentId={viewer.person.id} showGrade={course.gradeSettings.showTotalsToStudents} />
      )}
    </div>
  )
}

function SectionTitle({ children, href }: { children: React.ReactNode; href?: string }) {
  return (
    <div className="lms-between" style={{ margin: '4px 0 10px' }}>
      <h2 className="lms-dash__h2" style={{ margin: 0 }}>{children}</h2>
      {href && (
        <Link href={href} className="lms-btn lms-btn--ghost lms-btn--sm">
          View all →
        </Link>
      )}
    </div>
  )
}

async function TeacherOverview({ courseId }: { courseId: string }) {
  const roster = await listRoster(courseId)
  const assignments = await listAssignments(courseId)
  const published = assignments.filter((a) => a.published)
  const submittedCounts = await Promise.all(
    published.map(async (a) => {
      const states = await Promise.all(roster.map((s) => getSubmission(a.id, s.id)))
      return states.filter((sub) => sub.state === 'submitted').length
    }),
  )
  const toGrade = submittedCounts.reduce((n, x) => n + x, 0)

  const stats = [
    { label: 'Students', value: roster.length },
    { label: 'Assignments', value: published.length },
    { label: 'To grade', value: toGrade },
  ]

  return (
    <section>
      <SectionTitle>At a glance</SectionTitle>
      <div className="lms-courses">
        {stats.map((s) => (
          <div key={s.label} className="lms-card lms-card--pad">
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.value}</div>
            <div className="lms-muted">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

async function StudentOverview({ courseId, studentId, showGrade }: { courseId: string; studentId: string; showGrade: boolean }) {
  const grade = await courseGradeForStudent(courseId, studentId)
  const upcoming = await listUpcomingAssignments(courseId, 4)

  return (
    <>
      {showGrade && grade.pct != null && (
        <section>
          <SectionTitle href={`/courses/${courseId}/grades`}>Your grade</SectionTitle>
          <div className="lms-card lms-card--pad lms-between">
            <div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>
                {grade.pct}% <span className="lms-muted" style={{ fontSize: 18 }}>{grade.letter}</span>
              </div>
              <div className="lms-muted">Based on graded work so far</div>
            </div>
            <div style={{ width: 160 }}>
              <div className="lms-meter">
                <div className="lms-meter__fill" style={{ width: `${grade.pct}%` }} />
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <SectionTitle href={`/courses/${courseId}/assignments`}>Coming up</SectionTitle>
        {upcoming.length === 0 ? (
          <div className="lms-empty">Nothing due right now. 🎉</div>
        ) : (
          <div className="lms-list">
            {await Promise.all(upcoming.map(async (a) => {
              const missing = isMissing(a, await getSubmission(a.id, studentId))
              return (
                <HoverLink key={a.id} href={`/courses/${courseId}/assignments/${a.id}`} className="lms-row">
                  <div className="lms-row__icon" aria-hidden>
                    ✎
                  </div>
                  <div className="lms-row__main">
                    <div className="lms-row__title">{a.title}</div>
                    <div className="lms-row__meta">
                      Due {fmtDay(a.dueAt)} · {a.points} pts
                    </div>
                  </div>
                  {missing && <Badge tone="danger">Missing</Badge>}
                </HoverLink>
              )
            }))}
          </div>
        )}
      </section>
    </>
  )
}
