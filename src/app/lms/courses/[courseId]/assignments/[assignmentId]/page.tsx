import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getAssignment,
  getCourse,
  getQuiz,
  getRubric,
  getSubmission,
  listCoachRequests,
  listRoster,
  listSubmissionsForAssignment,
} from '@/lib/store'
import { isLate, isMissing } from '@/lib/grade-calc'
import { getViewer } from '@/lib/session'
import type { ProficiencyLevel } from '@/lib/bc-curriculum'
import type { Quiz } from '@/lib/types'
import { StandardList } from '../../../../../_components/Standards'
import { deleteAssignmentAction, takeQuizAction, turnInAction } from '../actions'
import { Badge, RichText, fmtDay, fmtRelative } from '../../../../../_components/ui'
import { SubmitButton } from '../../../../../_components/interactive'
import { llmConfigured } from '@/lib/ai/anthropic'
import { DraftCoach } from './DraftCoach'
import { ProvenanceBox } from './ProvenanceBox'

export const dynamic = 'force-dynamic'

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string }>
}) {
  const { courseId, assignmentId } = await params
  const course = await getCourse(courseId)
  if (!course) notFound()
  const viewer = await getViewer()
  const isTeacher = viewer.kind === 'teacher'
  const assignment = await getAssignment(assignmentId)
  if (!assignment || assignment.courseId !== course.id) notFound()
  const isQuiz = assignment.submissionType === 'quiz'
  const quiz = isQuiz ? await getQuiz(assignment.id) : undefined
  const rubric = assignment.rubricId ? await getRubric(assignment.rubricId) : undefined

  return (
    <div className="lms-stack" style={{ maxWidth: 760 }}>
      <div className="lms-breadcrumb">
        <Link href={`/lms/courses/${course.id}/assignments`}>Assignments</Link> / {assignment.title}
      </div>

      <div className="lms-header">
        <div>
          <h1 className="lms-h1">{assignment.title}</h1>
          <div className="lms-flex lms-muted lms-wrap" style={{ fontSize: 13 }}>
            <Badge tone={isQuiz ? 'info' : 'muted'}>{isQuiz ? 'Quiz' : assignment.category}</Badge>
            <span>{assignment.points} pts</span>
            <span aria-hidden>·</span>
            <span>Due {fmtDay(assignment.dueAt)}</span>
            {!assignment.published && <Badge tone="warn">Draft</Badge>}
          </div>
        </div>
        {isTeacher && (
          <div className="lms-flex lms-gap-sm lms-wrap" style={{ justifyContent: 'flex-end' }}>
            {!isQuiz && (
              <Link href={`/lms/courses/${course.id}/assignments/${assignment.id}/submissions`} className="lms-btn lms-btn--primary lms-btn--sm">
                Grade submissions
              </Link>
            )}
            <Link href={`/lms/courses/${course.id}/assignments/${assignment.id}/${isQuiz ? 'edit-quiz' : 'edit'}`} className="lms-btn lms-btn--sm">
              Edit
            </Link>
            <details className="lms-inline-delete">
              <summary className="lms-btn lms-btn--sm lms-btn--danger-ghost">Delete</summary>
              <form action={deleteAssignmentAction.bind(null, course.id, assignment.id)} className="lms-delete-confirm">
                <span className="lms-muted" style={{ fontSize: 12.5 }}>Delete this {isQuiz ? 'quiz' : 'assignment'} and all submissions?</span>
                <SubmitButton className="lms-btn lms-btn--sm lms-btn--danger">
                  Yes, delete
                </SubmitButton>
              </form>
            </details>
          </div>
        )}
      </div>

      <div className="lms-card lms-card--pad">
        {assignment.instructions ? (
          <RichText html={assignment.instructions} />
        ) : (
          <span className="lms-muted">No instructions provided.</span>
        )}
      </div>

      {(assignment.standardIds ?? []).length > 0 && (
        <section>
          <h2 className="lms-dash__h2" style={{ margin: '0 0 4px' }}>Learning standards</h2>
          <p className="lms-muted" style={{ margin: '0 0 10px', fontSize: 13 }}>
            {isTeacher
              ? 'What this work gives evidence for. Assess proficiency when you grade.'
              : 'What this work shows you can do.'}
          </p>
          <StandardList
            standardIds={assignment.standardIds}
            levels={isTeacher ? undefined : await studentLevels(assignment.id, viewer.person.id)}
          />
        </section>
      )}

      {!isQuiz && rubric && (
        <section>
          <h2 className="lms-dash__h2">{rubric.title}</h2>
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

      {isQuiz && quiz ? (
        isTeacher ? (
          <QuizTeacherView courseId={course.id} quiz={quiz} points={assignment.points} />
        ) : (
          <QuizStudentView courseId={course.id} quiz={quiz} points={assignment.points} studentId={viewer.person.id} />
        )
      ) : isTeacher ? (
        <TeacherSubmissionSummary courseId={course.id} assignmentId={assignment.id} points={assignment.points} />
      ) : (
        <StudentSubmitPanel courseId={course.id} assignmentId={assignment.id} studentId={viewer.person.id} />
      )}
    </div>
  )
}

/** Map of standardId → level for one student's submission, for inline display. */
async function studentLevels(assignmentId: string, studentId: string): Promise<Record<string, ProficiencyLevel>> {
  const sub = await getSubmission(assignmentId, studentId)
  const out: Record<string, ProficiencyLevel> = {}
  for (const sa of sub.standardAssessments ?? []) out[sa.standardId] = sa.level
  return out
}

// ---- Regular assignments -------------------------------------------------

async function TeacherSubmissionSummary({ courseId, assignmentId, points }: { courseId: string; assignmentId: string; points: number }) {
  const roster = await listRoster(courseId)
  const subs = await listSubmissionsForAssignment(assignmentId)
  const graded = subs.filter((s) => s.state === 'graded')
  const submitted = subs.filter((s) => s.state === 'submitted')
  const avg =
    graded.length > 0 ? Math.round((graded.reduce((n, s) => n + (s.score ?? 0), 0) / graded.length / points) * 100) : null

  // Not surveillance — no draft and no feedback text is stored. Just enough that
  // a teacher knows the tool is in use in their classroom and who is leaning on it.
  const coachRequests = await listCoachRequests(assignmentId)
  const askers = new Set(coachRequests.map((r) => r.studentId)).size

  const stats = [
    { label: 'Turned in', value: `${submitted.length + graded.length}/${roster.length}` },
    { label: 'To grade', value: submitted.length },
    { label: 'Class average', value: avg != null ? `${avg}%` : '—' },
    {
      label: askers === 1 ? 'Student asked for draft feedback' : 'Students asked for draft feedback',
      value: `${askers}/${roster.length}`,
    },
  ]

  return (
    <section>
      <h2 className="lms-dash__h2">Submissions</h2>
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

async function StudentSubmitPanel({ courseId, assignmentId, studentId }: { courseId: string; assignmentId: string; studentId: string }) {
  const assignment = await getAssignment(assignmentId)
  if (!assignment) return null
  const sub = await getSubmission(assignmentId, studentId)
  const action = turnInAction.bind(null, courseId, assignmentId, studentId)
  const rubric = assignment.rubricId ? await getRubric(assignment.rubricId) : undefined
  const late = isLate(assignment, sub)
  const missing = isMissing(assignment, sub)

  return (
    <section>
      <div className="lms-between" style={{ marginBottom: 10 }}>
        <h2 className="lms-dash__h2" style={{ margin: 0 }}>Your submission</h2>
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
          {rubric && sub.rubricScores.length > 0 && (
            <div>
              <div className="lms-muted" style={{ fontSize: 12.5, marginBottom: 6 }}>Rubric</div>
              <div className="lms-stack" style={{ gap: 6 }}>
                {rubric.criteria.map((c) => {
                  const earned = sub.rubricScores.find((r) => r.criterionId === c.id)
                  const level = earned ? c.levels.find((l) => l.points === earned.points) : undefined
                  return (
                    <div key={c.id} className="lms-between" style={{ fontSize: 13 }}>
                      <span>{c.name}</span>
                      <span style={{ fontWeight: 600 }}>
                        {level ? `${level.label} · ${earned?.points}` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
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
            {/* The notice sits ABOVE the box, not in a policy page or a tooltip.
                A student has to know before they type, not after. */}
            {assignment.processCapture && (
              <div className="lms-callout" style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>Your teacher can see how this was written.</strong>
                <div style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.55 }}>
                  This task records how long you spend in the box, how the length changes over time, and the size of
                  anything you paste in. <strong>What you write is not recorded</strong> — only the shape of the work.
                  Pasting is not against the rules; plenty of people draft somewhere else first.
                </div>
              </div>
            )}
            <ProvenanceBox
              assignmentId={assignmentId}
              studentId={studentId}
              defaultValue={sub.text}
              enabled={assignment.processCapture}
            />
          </div>
          <div className="lms-field">
            <label className="lms-label" htmlFor="fileName">
              Attach a file (name only — simulated upload)
            </label>
            <input id="fileName" name="fileName" className="lms-input" placeholder="e.g. lab-report.pdf" />
          </div>
          <SubmitButton className="lms-btn lms-btn--primary">
            {sub.state === 'submitted' ? 'Resubmit' : 'Turn in'}
          </SubmitButton>
        </form>
      )}

      {/* Feedback is for work still in progress; once it is graded the teacher
          has spoken and a second opinion would only muddy that. */}
      {assignment.draftCoach && sub.state !== 'graded' && (
        <DraftCoach
          courseId={courseId}
          assignmentId={assignmentId}
          studentId={studentId}
          modelConfigured={llmConfigured()}
        />
      )}
    </section>
  )
}

// ---- Quizzes -------------------------------------------------------------

async function QuizTeacherView({ courseId, quiz, points }: { courseId: string; quiz: Quiz; points: number }) {
  const roster = await listRoster(courseId)
  const subs = (await listSubmissionsForAssignment(quiz.assignmentId)).filter((s) => s.state === 'graded')
  const avg = subs.length > 0 ? Math.round((subs.reduce((n, s) => n + (s.score ?? 0), 0) / subs.length / points) * 100) : null

  return (
    <section className="lms-stack">
      <div className="lms-courses">
        <div className="lms-card lms-card--pad">
          <div style={{ fontSize: 26, fontWeight: 700 }}>
            {subs.length}/{roster.length}
          </div>
          <div className="lms-muted">Completed</div>
        </div>
        <div className="lms-card lms-card--pad">
          <div style={{ fontSize: 26, fontWeight: 700 }}>{avg != null ? `${avg}%` : '—'}</div>
          <div className="lms-muted">Class average</div>
        </div>
        <div className="lms-card lms-card--pad">
          <div style={{ fontSize: 26, fontWeight: 700 }}>{quiz.questions.length}</div>
          <div className="lms-muted">Questions · auto-graded</div>
        </div>
      </div>

      <h2 className="lms-dash__h2">Answer key</h2>
      <div className="lms-stack">
        {quiz.questions.map((q, i) => (
          <div key={q.id} className="lms-card lms-card--pad">
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              {i + 1}. {q.prompt}
            </div>
            <div className="lms-stack" style={{ gap: 6 }}>
              {q.options.map((opt, oi) => (
                <div key={oi} className="lms-flex" style={{ fontSize: 13.5 }}>
                  <span aria-hidden>{oi === q.correctIndex ? '✅' : '○'}</span>
                  <span style={{ fontWeight: oi === q.correctIndex ? 600 : 400 }}>{opt}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

async function QuizStudentView({ courseId, quiz, points, studentId }: { courseId: string; quiz: Quiz; points: number; studentId: string }) {
  const sub = await getSubmission(quiz.assignmentId, studentId)
  const taken = sub.state === 'graded'

  if (taken) {
    const correct = quiz.questions.reduce((n, q, i) => n + (sub.answers[i] === q.correctIndex ? 1 : 0), 0)
    return (
      <section className="lms-stack">
        <div className="lms-between">
          <h2 className="lms-dash__h2" style={{ margin: 0 }}>Your result</h2>
          <Badge tone="ok">
            {sub.score}/{points} · {correct}/{quiz.questions.length} correct
          </Badge>
        </div>
        <div className="lms-stack">
          {quiz.questions.map((q, i) => {
            const chosen = sub.answers[i]
            const right = chosen === q.correctIndex
            return (
              <div key={q.id} className="lms-card lms-card--pad">
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  {i + 1}. {q.prompt}
                </div>
                <div className="lms-stack" style={{ gap: 6 }}>
                  {q.options.map((opt, oi) => {
                    const isChosen = oi === chosen
                    const isCorrect = oi === q.correctIndex
                    const mark = isCorrect ? '✅' : isChosen ? '❌' : '○'
                    const color = isCorrect ? 'var(--lms-ok)' : isChosen ? 'var(--lms-danger)' : 'var(--lms-ink-soft)'
                    return (
                      <div key={oi} className="lms-flex" style={{ fontSize: 13.5, color }}>
                        <span aria-hidden>{mark}</span>
                        <span style={{ fontWeight: isChosen || isCorrect ? 600 : 400 }}>{opt}</span>
                      </div>
                    )
                  })}
                </div>
                {!right && <div className="lms-muted" style={{ fontSize: 12.5, marginTop: 6 }}>Your answer was marked incorrect.</div>}
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  const action = takeQuizAction.bind(null, courseId, quiz.assignmentId, studentId)
  return (
    <section>
      <h2 className="lms-dash__h2">Take the quiz</h2>
      <form action={action} className="lms-stack">
        {quiz.questions.map((q, i) => (
          <fieldset key={q.id} className="lms-card lms-card--pad" style={{ border: '1px solid var(--lms-line)', margin: 0 }}>
            <legend style={{ fontWeight: 600, padding: '0 6px' }}>
              {i + 1}. {q.prompt}
            </legend>
            <div className="lms-stack" style={{ gap: 8, marginTop: 6 }}>
              {q.options.map((opt, oi) => (
                <label key={oi} className="lms-flex" style={{ cursor: 'pointer', fontSize: 14 }}>
                  <input type="radio" name={`q${i}`} value={oi} required />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <SubmitButton className="lms-btn lms-btn--primary" style={{ alignSelf: 'flex-start' }}>
          Submit quiz
        </SubmitButton>
      </form>
    </section>
  )
}
