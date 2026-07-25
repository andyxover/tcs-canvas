import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getViewer } from '@/lib/session'
import { getAssignment, getCourse, getRubric, getSubmission, getWritingHistory, listRoster } from '@/lib/store'
import { summarize } from '@/lib/provenance'
import { isLate } from '@/lib/grade-calc'
import { PROFICIENCY_LEVELS, PROFICIENCY_META, getStandard } from '@/lib/bc-curriculum'
import type { Rubric, Submission } from '@/lib/types'
import { gradeAction } from '../../actions'
import { Avatar, Badge, fmtRelative } from '../../../../../../_components/ui'
import { SubmitButton } from '../../../../../../_components/interactive'
import { WritingProcess } from './WritingProcess'

export const dynamic = 'force-dynamic'

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string }>
}) {
  const { courseId, assignmentId } = await params
  const course = await getCourse(courseId)
  if (!course) notFound()
  const viewer = await getViewer()
  if (viewer.kind !== 'teacher') notFound()
  const assignment = await getAssignment(assignmentId)
  if (!assignment || assignment.courseId !== courseId) notFound()
  const roster = await listRoster(courseId)
  const rubric = assignment.rubricId ? await getRubric(assignment.rubricId) : undefined
  const standardIds = assignment.standardIds ?? []

  return (
    <div className="lms-stack">
      <div className="lms-breadcrumb">
        <Link href={`/lms/courses/${courseId}/assignments`}>Assignments</Link> /{' '}
        <Link href={`/lms/courses/${courseId}/assignments/${assignmentId}`}>{assignment.title}</Link> / Grade
      </div>
      <div className="lms-between">
        <h1 className="lms-h1">Grade: {assignment.title}</h1>
        <Badge tone="muted">{assignment.points} pts</Badge>
      </div>

      <div className="lms-stack">
        {await Promise.all(roster.map(async (student) => {
          const sub = await getSubmission(assignmentId, student.id)
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

              {/* Collapsed by default: how the work was written is context for a
                  question, not the first thing to greet a teacher opening a pile
                  of submissions to grade. */}
              {assignment.processCapture && sub.state !== 'unsubmitted' && (
                <details className="lms-evidence-panel" style={{ marginBottom: 12 }}>
                  <summary>How this was written</summary>
                  <div style={{ marginTop: 10 }}>
                    <WritingProcess summary={summarize(await getWritingHistory(assignment.id, student.id))} />
                  </div>
                </details>
              )}

              <form action={action} className="lms-stack">
                {rubric ? (
                  <RubricGrader rubric={rubric} sub={sub} />
                ) : (
                  <div style={{ width: 140 }}>
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
                )}
                {standardIds.length > 0 && <StandardAssessor standardIds={standardIds} sub={sub} />}

                <div className="lms-flex lms-wrap" style={{ alignItems: 'flex-end', gap: 12 }}>
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
                  <SubmitButton className="lms-btn lms-btn--primary">
                    Save
                  </SubmitButton>
                </div>
              </form>
            </div>
          )
        }))}
      </div>
    </div>
  )
}

async function StandardAssessor({ standardIds, sub }: { standardIds: string[]; sub: Submission }) {
  const chosen = new Map(sub.standardAssessments?.map((a) => [a.standardId, a.level]) ?? [])
  const stdById = new Map(
    (await Promise.all(standardIds.map((id) => getStandard(id))))
      .filter((x) => x != null)
      .map((x) => [x.id, x] as const),
  )
  return (
    <div className="lms-stack" style={{ gap: 10 }}>
      <div className="lms-muted" style={{ fontSize: 12.5 }}>
        Proficiency against the BC learning standards this work evidences.
      </div>
      {standardIds.map((sid) => {
        const std = stdById.get(sid)
        if (!std) return null
        return (
          <div key={sid}>
            <div style={{ fontSize: 13, marginBottom: 5 }}>
              <code className="lms-stdpick__code">{std.code}</code>{' '}
              <span className="lms-muted">{std.text}</span>
            </div>
            <div className="lms-flex lms-wrap" style={{ gap: 6 }}>
              {PROFICIENCY_LEVELS.map((lvl) => {
                const m = PROFICIENCY_META[lvl]
                return (
                  <label
                    key={lvl}
                    className="lms-flex"
                    title={m.description}
                    style={{ gap: 5, border: '1px solid var(--lms-line)', borderRadius: 8, padding: '5px 9px', cursor: 'pointer', fontSize: 12.5 }}
                  >
                    <input type="radio" name={`std-${sid}`} value={lvl} defaultChecked={chosen.get(sid) === lvl} />
                    <span style={{ color: m.color, fontWeight: 600 }}>{m.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RubricGrader({ rubric, sub }: { rubric: Rubric; sub: Submission }) {
  return (
    <div className="lms-stack" style={{ gap: 10 }}>
      <div className="lms-muted" style={{ fontSize: 12.5 }}>
        {rubric.title} — the score is the sum of the levels you pick.
      </div>
      {rubric.criteria.map((c) => {
        const chosen = sub.rubricScores.find((r) => r.criterionId === c.id)
        return (
          <div key={c.id}>
            <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 6 }}>{c.name}</div>
            <div className="lms-flex lms-wrap" style={{ gap: 8 }}>
              {c.levels.map((l) => (
                <label
                  key={l.label}
                  className="lms-flex"
                  title={l.description}
                  style={{ gap: 6, border: '1px solid var(--lms-line)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 13 }}
                >
                  <input type="radio" name={`crit-${c.id}`} value={l.points} defaultChecked={chosen?.points === l.points} />
                  <span>
                    {l.label} <span className="lms-faint">· {l.points}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
