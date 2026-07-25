import Link from 'next/link'
import {
  courseGradeForStudent,
  getSubmission,
  listAssignments,
  listRoster,
} from '@/lib/store'
import { isMissing, letterForPct } from '@/lib/grade-calc'
import type { Assignment, Course } from '@/lib/types'
import { courseCtx } from '../_shared'
import { Avatar, Badge, EmptyState } from '../../../_components/ui'
import { HoverLink } from '../../../_components/interactive'

export const dynamic = 'force-dynamic'

export default async function GradesPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { course, viewer, isTeacher } = await courseCtx(params)
  return isTeacher ? <TeacherGradebook course={course} /> : <StudentGrades course={course} studentId={viewer.person.id} />
}

function TeacherGradebook({ course }: { course: Course }) {
  const roster = listRoster(course.id)
  const assignments = listAssignments(course.id).filter((a) => a.published)

  if (assignments.length === 0) {
    return (
      <div className="lms-stack">
        <h1 className="lms-h1">Gradebook</h1>
        <EmptyState icon="◈" title="No published assignments" hint="Publish an assignment to start grading." />
      </div>
    )
  }

  return (
    <div className="lms-stack">
      <div className="lms-between">
        <h1 className="lms-h1">Gradebook</h1>
        <Badge tone="muted">{course.gradeSettings.calc} grading</Badge>
      </div>

      <div className="lms-tablewrap">
        <table className="lms-table">
          <thead>
            <tr>
              <th className="lms-table__student">Student</th>
              {assignments.map((a) => (
                <th key={a.id} className="lms-table__num" title={`${a.title} · ${a.category}`}>
                  {abbrev(a.title)}
                  <div className="lms-faint" style={{ fontWeight: 400, textTransform: 'none' }}>
                    /{a.points}
                  </div>
                </th>
              ))}
              <th className="lms-table__num">Total</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((student) => {
              const grade = courseGradeForStudent(course.id, student.id)
              return (
                <tr key={student.id}>
                  <td className="lms-table__student">
                    <div className="lms-flex">
                      <Avatar person={student} size={26} />
                      <span>{student.name}</span>
                    </div>
                  </td>
                  {assignments.map((a) => (
                    <td key={a.id} className="lms-table__num">
                      <GradeCell assignment={a} studentId={student.id} />
                    </td>
                  ))}
                  <td className="lms-table__num" style={{ fontWeight: 700 }}>
                    {grade.pct != null ? `${grade.pct}%` : '—'}
                    {grade.letter && <span className="lms-faint" style={{ fontWeight: 400 }}> {grade.letter}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function GradeCell({ assignment, studentId }: { assignment: Assignment; studentId: string }) {
  const sub = getSubmission(assignment.id, studentId)
  if (sub.score != null) return <>{sub.score}</>
  if (isMissing(assignment, sub)) return <span className="lms-cell-missing">M</span>
  if (sub.state === 'submitted') return <span className="lms-cell-empty">•</span>
  return <span className="lms-cell-empty">—</span>
}

function StudentGrades({ course, studentId }: { course: Course; studentId: string }) {
  const assignments = listAssignments(course.id).filter((a) => a.published)
  const grade = courseGradeForStudent(course.id, studentId)
  const showTotals = course.gradeSettings.showTotalsToStudents

  return (
    <div className="lms-stack">
      <h1 className="lms-h1">Grades</h1>

      {showTotals && grade.pct != null && (
        <div className="lms-card lms-card--pad lms-between">
          <div>
            <div className="lms-muted" style={{ fontSize: 12.5 }}>Current grade</div>
            <div style={{ fontSize: 30, fontWeight: 700 }}>
              {grade.pct}% <span className="lms-muted" style={{ fontSize: 17 }}>{grade.letter}</span>
            </div>
          </div>
          <div style={{ width: 180 }}>
            {grade.categories
              .filter((c) => c.pct != null)
              .map((c) => (
                <div key={c.name} className="lms-between" style={{ fontSize: 12.5, marginBottom: 4 }}>
                  <span className="lms-muted">
                    {c.name} <span className="lms-faint">({c.weight}%)</span>
                  </span>
                  <span style={{ fontWeight: 600 }}>{c.pct}%</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="lms-tablewrap">
        <table className="lms-table">
          <thead>
            <tr>
              <th>Assignment</th>
              <th>Category</th>
              <th className="lms-table__num">Score</th>
              <th className="lms-table__num">%</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => {
              const sub = getSubmission(a.id, studentId)
              const pct = sub.score != null ? Math.round((sub.score / a.points) * 100) : null
              return (
                <tr key={a.id}>
                  <td className="lms-table__student" style={{ fontWeight: 500 }}>
                    <HoverLink href={`/courses/${course.id}/assignments/${a.id}`}>{a.title}</HoverLink>
                  </td>
                  <td className="lms-muted">{a.category}</td>
                  <td className="lms-table__num">
                    {sub.score != null ? (
                      `${sub.score}/${a.points}`
                    ) : isMissing(a, sub) ? (
                      <span className="lms-cell-missing">Missing</span>
                    ) : sub.state === 'submitted' ? (
                      <span className="lms-cell-empty">Submitted</span>
                    ) : (
                      <span className="lms-cell-empty">—</span>
                    )}
                  </td>
                  <td className="lms-table__num">{pct != null ? `${pct}% ${letterForPct(pct) ?? ''}` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function abbrev(title: string): string {
  return title.length > 16 ? `${title.slice(0, 15)}…` : title
}
