import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getViewer } from '@/lib/session'
import { getAssignment, getCourse, getSubmission, listRoster } from '@/lib/store'
import { isLate } from '@/lib/grade-calc'
import { gradeAction } from '../../actions'
import { Avatar, Badge, fmtRelative } from '../../../../../_components/ui'

export const dynamic = 'force-dynamic'

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string }>
}) {
  const { courseId, assignmentId } = await params
  const course = getCourse(courseId)
  if (!course) notFound()
  const viewer = await getViewer()
  if (viewer.kind !== 'teacher') notFound()
  const assignment = getAssignment(assignmentId)
  if (!assignment || assignment.courseId !== courseId) notFound()
  const roster = listRoster(courseId)

  return (
    <div className="lms-stack">
      <div className="lms-breadcrumb">
        <Link href={`/courses/${courseId}/assignments`}>Assignments</Link> /{' '}
        <Link href={`/courses/${courseId}/assignments/${assignmentId}`}>{assignment.title}</Link> / Grade
      </div>
      <div className="lms-between">
        <h1 className="lms-h1">Grade: {assignment.title}</h1>
        <Badge tone="muted">{assignment.points} pts</Badge>
      </div>

      <div className="lms-stack">
        {roster.map((student) => {
          const sub = getSubmission(assignmentId, student.id)
          const action = gradeAction.bind(null, courseId, assignmentId, student.id)
          const late = isLate(assignment, sub)
          return (
            <div key={student.id} className="lms-card lms-card--pad">
              <div className="lms-between" style={{ marginBottom: 12 }}>
                <div className="lms-flex">
                  <Avatar person={student} size={34} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{student.name}</div>
                    <div className="lms-row__meta">
                      {sub.state === 'unsubmitted' ? (
                        'Not submitted'
                      ) : (
                        <>Turned in {fmtRelative(sub.submittedAt)}</>
                      )}
                    </div>
                  </div>
                </div>
                <div className="lms-flex lms-gap-sm">
                  {sub.state === 'graded' && <Badge tone="ok">Graded</Badge>}
                  {sub.state === 'submitted' && <Badge tone="warn">Needs grading</Badge>}
                  {late && <Badge tone="danger">Late</Badge>}
                </div>
              </div>

              {sub.state !== 'unsubmitted' && (sub.text || sub.attachments.length > 0) && (
                <div className="lms-card lms-card--pad" style={{ background: 'var(--lms-bg)', marginBottom: 12 }}>
                  {sub.text && <p style={{ margin: 0 }}>{sub.text}</p>}
                  {sub.attachments.length > 0 && (
                    <div className="lms-muted" style={{ fontSize: 13, marginTop: sub.text ? 8 : 0 }}>
                      📎 {sub.attachments.map((a) => a.name).join(', ')}
                    </div>
                  )}
                </div>
              )}

              <form action={action} className="lms-flex lms-wrap" style={{ alignItems: 'flex-end', gap: 12 }}>
                <div style={{ width: 120 }}>
                  <label className="lms-label" htmlFor={`score-${student.id}`}>
                    Score
                  </label>
                  <input
                    id={`score-${student.id}`}
                    name="score"
                    type="number"
                    min={0}
                    max={assignment.points}
                    step="any"
                    defaultValue={sub.score ?? ''}
                    className="lms-input"
                    placeholder={`/ ${assignment.points}`}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label className="lms-label" htmlFor={`fb-${student.id}`}>
                    Feedback
                  </label>
                  <input
                    id={`fb-${student.id}`}
                    name="feedback"
                    defaultValue={sub.feedback}
                    className="lms-input"
                    placeholder="Optional comment"
                  />
                </div>
                <button type="submit" className="lms-btn lms-btn--primary">
                  Save
                </button>
              </form>
            </div>
          )
        })}
      </div>
    </div>
  )
}
