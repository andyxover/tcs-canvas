import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getViewer } from '@/lib/session'
import { getAssignment, getCourse, listRubrics } from '@/lib/store'
import { standardsFor } from '@/lib/bc-curriculum'
import { updateAssignmentAction } from '../../actions'
import { RichTextField } from '../../../../../_components/RichTextField'
import { StandardPicker } from '../../../../../_components/StandardPicker'
import { SubmitButton } from '../../../../../_components/interactive'

export const dynamic = 'force-dynamic'

export default async function EditAssignmentPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string }>
}) {
  const { courseId, assignmentId } = await params
  const course = getCourse(courseId)
  if (!course) notFound()
  const viewer = await getViewer()
  if (viewer.kind !== 'teacher') notFound()
  const a = getAssignment(assignmentId)
  if (!a || a.courseId !== courseId) notFound()

  const isQuiz = a.submissionType === 'quiz'
  const rubrics = listRubrics(course.id)
  const standards = standardsFor(course.curriculum?.subject, course.curriculum?.grade)
  const action = updateAssignmentAction.bind(null, course.id, a.id)
  const dueLocal = a.dueAt ? a.dueAt.slice(0, 16) : ''

  return (
    <div className="lms-stack" style={{ maxWidth: 680 }}>
      <div className="lms-breadcrumb">
        <Link href={`/courses/${course.id}/assignments`}>Assignments</Link> /{' '}
        <Link href={`/courses/${course.id}/assignments/${a.id}`}>{a.title}</Link> / Edit
      </div>
      <h1 className="lms-h1">Edit {isQuiz ? 'quiz' : 'assignment'}</h1>
      {isQuiz && <p className="lms-muted" style={{ margin: 0 }}>Editing the quiz details here. Questions stay as authored.</p>}

      <form action={action} className="lms-card lms-card--pad">
        <div className="lms-field">
          <label className="lms-label" htmlFor="title">
            Title
          </label>
          <input id="title" name="title" className="lms-input" defaultValue={a.title} required />
        </div>

        <div className="lms-field">
          <label className="lms-label">Instructions</label>
          <RichTextField name="instructions" defaultHTML={a.instructions} placeholder="Describe the task…" />
        </div>

        <div className="lms-form-row">
          <div className="lms-field">
            <label className="lms-label" htmlFor="points">
              Points
            </label>
            <input id="points" name="points" type="number" min={0} max={1000} defaultValue={a.points} className="lms-input" />
          </div>
          <div className="lms-field">
            <label className="lms-label" htmlFor="category">
              Category
            </label>
            <select id="category" name="category" className="lms-select" defaultValue={a.category}>
              {course.gradeSettings.categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="lms-form-row">
          <div className="lms-field">
            <label className="lms-label" htmlFor="dueAt">
              Due date
            </label>
            <input id="dueAt" name="dueAt" type="datetime-local" defaultValue={dueLocal} className="lms-input" />
          </div>
          {!isQuiz && rubrics.length > 0 && (
            <div className="lms-field">
              <label className="lms-label" htmlFor="rubricId">
                Rubric (optional)
              </label>
              <select id="rubricId" name="rubricId" className="lms-select" defaultValue={a.rubricId ?? ''}>
                <option value="">None</option>
                {rubrics.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="lms-field">
          <label className="lms-label">
            BC learning standards
            {course.curriculum && (
              <span className="lms-faint" style={{ fontWeight: 400 }}>
                {' '}— {course.curriculum.subject} {course.curriculum.grade}
              </span>
            )}
          </label>
          <StandardPicker available={standards} defaultSelected={a.standardIds ?? []} />
        </div>

        <div className="lms-field">
          <label className="lms-flex" style={{ cursor: 'pointer' }}>
            <input type="checkbox" name="published" defaultChecked={a.published} />
            <span>Published (students can see it)</span>
          </label>
        </div>

        <div className="lms-flex" style={{ marginTop: 8 }}>
          <SubmitButton className="lms-btn lms-btn--primary">
            Save changes
          </SubmitButton>
          <Link href={`/courses/${course.id}/assignments/${a.id}`} className="lms-btn lms-btn--ghost">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
