import Link from 'next/link'
import { notFound } from 'next/navigation'
import { listRubrics } from '@/lib/store'
import { courseCtx } from '../../_shared'
import { createAssignmentAction } from '../actions'
import { RichTextEditor } from '../../../../_components/RichTextEditor'

export const dynamic = 'force-dynamic'

export default async function NewAssignmentPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { course, isTeacher } = await courseCtx(params)
  if (!isTeacher) notFound()
  const rubrics = listRubrics(course.id)
  const action = createAssignmentAction.bind(null, course.id)

  return (
    <div className="lms-stack" style={{ maxWidth: 680 }}>
      <div className="lms-breadcrumb">
        <Link href={`/courses/${course.id}/assignments`}>Assignments</Link> / New
      </div>
      <h1 className="lms-h1">New assignment</h1>

      <form action={action} className="lms-card lms-card--pad">
        <div className="lms-field">
          <label className="lms-label" htmlFor="title">
            Title
          </label>
          <input id="title" name="title" className="lms-input" placeholder="e.g. Lab: Density of Solids" required />
        </div>

        <div className="lms-field">
          <label className="lms-label">Instructions</label>
          <RichTextEditor name="instructions" placeholder="Describe the task…" />
        </div>

        <div className="lms-form-row">
          <div className="lms-field">
            <label className="lms-label" htmlFor="points">
              Points
            </label>
            <input id="points" name="points" type="number" min={0} max={1000} defaultValue={100} className="lms-input" />
          </div>
          <div className="lms-field">
            <label className="lms-label" htmlFor="category">
              Category
            </label>
            <select id="category" name="category" className="lms-select" defaultValue={course.gradeSettings.categories[0]?.name}>
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
            <input id="dueAt" name="dueAt" type="datetime-local" className="lms-input" />
          </div>
          {rubrics.length > 0 && (
            <div className="lms-field">
              <label className="lms-label" htmlFor="rubricId">
                Rubric (optional)
              </label>
              <select id="rubricId" name="rubricId" className="lms-select" defaultValue="">
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
          <label className="lms-flex" style={{ cursor: 'pointer' }}>
            <input type="checkbox" name="published" defaultChecked />
            <span>Publish immediately (students can see it)</span>
          </label>
        </div>

        <div className="lms-flex" style={{ marginTop: 8 }}>
          <button type="submit" className="lms-btn lms-btn--primary">
            Create assignment
          </button>
          <Link href={`/courses/${course.id}/assignments`} className="lms-btn lms-btn--ghost">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
