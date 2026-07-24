import Link from 'next/link'
import {
  getSubmission,
  listAssignments,
  listRoster,
  listSubmissionsForAssignment,
} from '@/lib/store'
import { isLate, isMissing } from '@/lib/grade-calc'
import type { Assignment } from '@/lib/types'
import { courseCtx } from '../_shared'
import { Badge, EmptyState, fmtDay } from '../../../_components/ui'

export const dynamic = 'force-dynamic'

export default async function AssignmentsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { course, viewer, isTeacher } = await courseCtx(params)
  const assignments = listAssignments(course.id).filter((a) => isTeacher || a.published)

  return (
    <div className="lms-stack">
      <div className="lms-between">
        <h1 className="lms-h1">Assignments</h1>
        {isTeacher && (
          <Link href={`/courses/${course.id}/assignments/new`} className="lms-btn lms-btn--primary lms-btn--sm">
            + Assignment
          </Link>
        )}
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          icon="✎"
          title="No assignments yet"
          hint={isTeacher ? 'Create the first assignment to get started.' : 'Check back soon.'}
        />
      ) : (
        <div className="lms-list">
          {assignments.map((a) => (
            <Link key={a.id} href={`/courses/${course.id}/assignments/${a.id}`} className="lms-row">
              <div className="lms-row__icon" aria-hidden>
                {a.submissionType === 'quiz' ? '◎' : '✎'}
              </div>
              <div className="lms-row__main">
                <div className="lms-row__title">
                  {a.title}
                  {a.submissionType === 'quiz' && (
                    <span style={{ marginLeft: 8 }}>
                      <Badge tone="info">Quiz</Badge>
                    </span>
                  )}
                  {!a.published && (
                    <span style={{ marginLeft: 8 }}>
                      <Badge tone="muted">Draft</Badge>
                    </span>
                  )}
                </div>
                <div className="lms-row__meta">
                  Due {fmtDay(a.dueAt)} · {a.points} pts · {a.category}
                </div>
              </div>
              {isTeacher ? (
                <TeacherStatus assignment={a} courseId={course.id} />
              ) : (
                <StudentStatus assignment={a} studentId={viewer.person.id} />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function TeacherStatus({ assignment, courseId }: { assignment: Assignment; courseId: string }) {
  const roster = listRoster(courseId)
  const subs = listSubmissionsForAssignment(assignment.id)
  const graded = subs.filter((s) => s.state === 'graded').length
  const submitted = subs.filter((s) => s.state === 'submitted').length
  return (
    <div className="lms-flex lms-gap-sm">
      {submitted > 0 && <Badge tone="warn">{submitted} to grade</Badge>}
      <Badge tone="muted">
        {graded}/{roster.length} graded
      </Badge>
    </div>
  )
}

function StudentStatus({ assignment, studentId }: { assignment: Assignment; studentId: string }) {
  const sub = getSubmission(assignment.id, studentId)
  if (sub.state === 'graded') {
    return (
      <Badge tone="ok">
        {sub.score}/{assignment.points}
      </Badge>
    )
  }
  if (sub.state === 'submitted') {
    return <Badge tone="info">{isLate(assignment, sub) ? 'Submitted · late' : 'Submitted'}</Badge>
  }
  if (isMissing(assignment, sub)) return <Badge tone="danger">Missing</Badge>
  return <Badge tone="muted">Not submitted</Badge>
}
