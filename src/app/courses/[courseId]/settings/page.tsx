import { notFound } from 'next/navigation'
import { courseCtx } from '../_shared'
import { saveCourseSettingsAction } from './actions'
import { CategoryEditor } from './CategoryEditor'
import { SubmitButton } from '../../../_components/interactive'

export const dynamic = 'force-dynamic'

export default async function CourseSettingsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { course, isTeacher } = await courseCtx(params)
  if (!isTeacher) notFound()
  const gs = course.gradeSettings
  const action = saveCourseSettingsAction.bind(null, course.id)

  return (
    <div className="lms-stack" style={{ maxWidth: 680 }}>
      <h1 className="lms-h1">Course settings</h1>

      <form action={action} className="lms-stack">
        <div className="lms-card lms-card--pad">
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Details</h2>
          <div className="lms-field">
            <label className="lms-label" htmlFor="name">
              Course name
            </label>
            <input id="name" name="name" className="lms-input" defaultValue={course.name} required />
          </div>
          <div className="lms-form-row">
            <div className="lms-field">
              <label className="lms-label" htmlFor="code">
                Code
              </label>
              <input id="code" name="code" className="lms-input" defaultValue={course.code} />
            </div>
            <div className="lms-field">
              <label className="lms-label" htmlFor="term">
                Term
              </label>
              <input id="term" name="term" className="lms-input" defaultValue={course.term} />
            </div>
          </div>
          <div className="lms-field" style={{ marginBottom: 0 }}>
            <label className="lms-label" htmlFor="color">
              Course colour
            </label>
            <input id="color" name="color" type="color" defaultValue={course.color} style={{ width: 64, height: 38, padding: 3, border: '1px solid var(--lms-line-strong)', borderRadius: 8, background: 'var(--lms-surface)', cursor: 'pointer' }} />
          </div>
        </div>

        <div className="lms-card lms-card--pad">
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Grading</h2>
          <div className="lms-form-row">
            <div className="lms-field">
              <label className="lms-label" htmlFor="calc">
                Calculation
              </label>
              <select id="calc" name="calc" className="lms-select" defaultValue={gs.calc}>
                <option value="weighted">Weighted by category</option>
                <option value="total">Total points</option>
                <option value="none">No overall grade</option>
              </select>
            </div>
            <div className="lms-field" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label className="lms-flex" style={{ cursor: 'pointer', paddingBottom: 10 }}>
                <input type="checkbox" name="showTotals" defaultChecked={gs.showTotalsToStudents} />
                <span>Show overall grade to students</span>
              </label>
            </div>
          </div>

          <div className="lms-field" style={{ marginBottom: 0 }}>
            <label className="lms-label">Categories &amp; weights</label>
            <CategoryEditor defaultCategories={gs.categories} />
          </div>
        </div>

        <SubmitButton className="lms-btn lms-btn--primary" style={{ alignSelf: 'flex-start' }}>
          Save settings
        </SubmitButton>
      </form>
    </div>
  )
}
