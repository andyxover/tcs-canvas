import Link from 'next/link'
import { getViewer } from '@/lib/session'
import {
  agendaForCourses,
  getSubmission,
  listCoursesForStudent,
  listCoursesForTeacher,
  type AgendaEntry,
} from '@/lib/store'
import { getAssignment } from '@/lib/store'
import { isMissing } from '@/lib/grade-calc'
import { Badge, EmptyState, fmtDay } from '../_components/ui'

export const dynamic = 'force-dynamic'

const DAY_KEY = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Asia/Taipei',
})

export default async function AgendaPage() {
  const viewer = await getViewer()
  const isTeacher = viewer.kind === 'teacher'
  const courses = isTeacher ? listCoursesForTeacher(viewer.person.id) : listCoursesForStudent(viewer.person.id)
  const entries = agendaForCourses(courses.map((c) => c.id))

  // Group entries by calendar day (Taipei).
  const groups = new Map<string, AgendaEntry[]>()
  for (const e of entries) {
    const key = DAY_KEY.format(new Date(e.dueAt))
    const arr = groups.get(key) ?? []
    arr.push(e)
    groups.set(key, arr)
  }

  return (
    <main className="lms-page">
      <div className="lms-header">
        <div>
          <h1 className="lms-h1">Agenda</h1>
          <p className="lms-sub">Everything due across your courses in the next three weeks.</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyState icon="🗓️" title="Nothing due soon" hint="You're all caught up for the next three weeks." />
      ) : (
        <div className="lms-stack" style={{ gap: 22 }}>
          {[...groups.entries()].map(([key, items]) => (
            <section key={key}>
              <div className="lms-flex" style={{ marginBottom: 8, gap: 8 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{fmtDay(items[0].dueAt)}</h2>
                <span className="lms-faint" style={{ fontSize: 12.5 }}>
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className="lms-list">
                {items.map((e) => (
                  <AgendaRow key={e.assignmentId} entry={e} isTeacher={isTeacher} studentId={viewer.person.id} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}

function AgendaRow({ entry, isTeacher, studentId }: { entry: AgendaEntry; isTeacher: boolean; studentId: string }) {
  const assignment = getAssignment(entry.assignmentId)
  const sub = !isTeacher ? getSubmission(entry.assignmentId, studentId) : undefined
  const missing = assignment && sub ? isMissing(assignment, sub) : false

  return (
    <Link href={`/courses/${entry.courseId}/assignments/${entry.assignmentId}`} className="lms-row">
      <span
        aria-hidden
        style={{ width: 6, alignSelf: 'stretch', borderRadius: 3, background: entry.courseColor, flexShrink: 0 }}
      />
      <div className="lms-row__main">
        <div className="lms-row__title">
          {entry.title}
          {entry.isQuiz && (
            <span style={{ marginLeft: 8 }}>
              <Badge tone="info">Quiz</Badge>
            </span>
          )}
        </div>
        <div className="lms-row__meta">
          {entry.courseName} · {entry.points} pts
        </div>
      </div>
      {!isTeacher && sub && (
        <StudentTag graded={sub.state === 'graded'} submitted={sub.state === 'submitted'} missing={missing} />
      )}
    </Link>
  )
}

function StudentTag({ graded, submitted, missing }: { graded: boolean; submitted: boolean; missing: boolean }) {
  if (graded) return <Badge tone="ok">Done</Badge>
  if (submitted) return <Badge tone="info">Submitted</Badge>
  if (missing) return <Badge tone="danger">Missing</Badge>
  return <Badge tone="muted">To do</Badge>
}
