import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getAssignment,
  getRubric,
  getSubmission,
  listRoster,
  listSubmissionsForAssignment,
} from '@/lib/store'
import { isLate, isMissing } from '@/lib/grade-calc'
import { getViewer } from '@/lib/session'
import { getCourse } from '@/lib/store'
import { turnInAction } from '../actions'
import { Badge, RichText, fmtDay, fmtRelative } from '../../../../_components/ui'

export const dynamic = 'force-dynamic'

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string }>
}) {
  const { courseId, assignmentId } = await params
  const course = getCourse(courseId)
  if (!course) notFound()
  const viewer = await getViewer()
  const isTeacher = viewer.kind === 'teacher'
  const assignment = getAssignment(assignmentId)
  if (!assignment || assignment.courseId !== course.id) notFound()
  const rubric = assignment.rubricId ? getRubric(assignment.rubricId) : undefined

  return (
    <div className="lms-stack" style={{ maxWidth: 760 }}>
      <div className="lms-breadcrumb">
        <Link href={`/courses/${course.id}/assignments`}>Assignments</Link> / {assignment.title}
      </div>

      <div className="lms-header">
        <div>
          <h1 className="lms-h1">{assignment.title}</h1>
          <div className="lms-flex lms-muted lms-wrap" style={{ fontSize: 13 }}>
            <Badge tone="muted">{assignment.category}</Badge>
            <span>{assignment.points} pts</span>
            <span aria-hidden>·</span>
            <span>Due {fmtDay(assignment.dueAt)}</span>
            {!assignment.published && <Badge tone="warn">Draft</Badge>}
          </div>
        </div>
        {isTeacher && (
          <Link href={`/courses/${course.id}/assignments/${assignment.id}/submissions`} className="lms-btn lms-btn--primary lms-btn--sm">
            Grade submissions
          </Link>
        )}
      </div>

      <div className="lms-card lms-card--pad">
        {assignment.instructions ? (
          <RichText html={assignment.instructions} />
        ) : (
          <span className="lms-muted">No instructions provided.</span>
        )}
      </div>

      {rubric && (
        <section>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>{rubric.title}</h2>
          <div className="lms-stack">
            {rubric.criteria.map((c) => (
              <div key={c.id} className="lms-card lms-card--pad">
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{c.name}</div>
                <div className="lms-flex lms-wrap lms-gap-sm">
                  {c.levels.map((l) => (
                    <div key={l.label} className="lms-badge lms-badge--muted" title={l.description}>
                      {l.label} · {l.points}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isTeacher ? (
        <TeacherSubmissionSummary courseId={course.id} assignmentId={assignment.id} points={assignment.points} />
      ) : (
        <StudentSubmitPanel courseId={course.id} assignmentId={assignment.id} studentId={viewer.person.id} />
      )}
    </div>
  )
}

function TeacherSubmissionSummary({ courseId, assignmentId, points }: { courseId: string; assignmentId: string; points: number }) {
  const roster = listRoster(courseId)
  const subs = listSubmissionsForAssignment(assignmentId)
  const graded = subs.filter((s) => s.state === 'graded')
  const submitted = subs.filter((s) => s.state === 'submitted')
  const avg =
    graded.length > 0 ? Math.round((graded.reduce((n, s) => n + (s.score ?? 0), 0) / graded.length / points) * 100) : null

  const stats = [
    { label: 'Turned in', value: `${submitted.length + graded.length}/${roster.length}` },
    { label: 'To grade', value: submitted.length },
    { label: 'Class average', value: avg != null ? `${avg}%` : '—' },
  ]

  return (
    <section>
      <h2 style={{ fontSize: 15, fontWeight: 700 }}>Submissions</h2>
      <div className="lms-courses">
        {stats.map((s) => (
          <div key={s.label} className="lms-card lms-card--pad">
            <div style={{ fontSize: 26, fontWeight: 700 }}>{s.value}</div>
            <div className="lms-muted">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function StudentSubmitPanel({ courseId, assignmentId, studentId }: { courseId: string; assignmentId: string; studentId: string }) {
  const assignment = getAssignment(assignmentId)
  if (!assignment) return null
  const sub = getSubmission(assignmentId, studentId)
  const action = turnInAction.bind(null, courseId, assignmentId, studentId)
  const late = isLate(assignment, sub)
  const missing = isMissing(assignment, sub)

  return (
    <section>
      <div className="lms-between" style={{ marginBottom: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Your submission</h2>
        {sub.state === 'graded' && (
          <Badge tone="ok">
            Graded · {sub.score}/{assignment.points}
          </Badge>
        )}
        {sub.state === 'submitted' && <Badge tone="info">{late ? 'Submitted · late' : 'Submitted'}</Badge>}
        {sub.state === 'unsubmitted' && (missing ? <Badge tone="danger">Missing</Badge> : <Badge tone="muted">Not submitted</Badge>)}
      </div>

      {sub.state === 'graded' && (
        <div className="lms-card lms-card--pad lms-stack">
          <div>
            <div className="lms-muted" style={{ fontSize: 12.5 }}>Score</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {sub.score} <span className="lms-muted" style={{ fontSize: 15 }}>/ {assignment.points}</span>
            </div>
          </div>
          {sub.feedback && (
            <div>
              <div className="lms-muted" style={{ fontSize: 12.5, marginBottom: 4 }}>Teacher feedback</div>
              <div>{sub.feedback}</div>
            </div>
          )}
          {sub.attachments.length > 0 && (
            <div className="lms-muted" style={{ fontSize: 13 }}>
              📎 {sub.attachments.map((a) => a.name).join(', ')}
            </div>
          )}
        </div>
      )}

      {sub.state !== 'graded' && (
        <form action={action} className="lms-card lms-card--pad">
          {sub.state === 'submitted' && (
            <p className="lms-muted" style={{ marginTop: 0 }}>
              You turned this in {fmtRelative(sub.submittedAt)}. You can resubmit until it&apos;s graded.
            </p>
          )}
          <div className="lms-field">
            <label className="lms-label" htmlFor="text">
              Response
            </label>
            <textarea id="text" name="text" className="lms-textarea" defaultValue={sub.text} placeholder="Type your response…" />
          </div>
          <div className="lms-field">
            <label className="lms-label" htmlFor="fileName">
              Attach a file (name only — simulated upload)
            </label>
            <input id="fileName" name="fileName" className="lms-input" placeholder="e.g. lab-report.pdf" />
          </div>
          <button type="submit" className="lms-btn lms-btn--primary">
            {sub.state === 'submitted' ? 'Resubmit' : 'Turn in'}
          </button>
        </form>
      )}
    </section>
  )
}
