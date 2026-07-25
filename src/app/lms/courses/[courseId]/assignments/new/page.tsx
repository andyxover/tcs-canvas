import Link from 'next/link'
import { notFound } from 'next/navigation'
import { listRubrics } from '@/lib/store'
import { standardsFor } from '@/lib/bc-curriculum'
import { courseCtx } from '../../_shared'
import { createAssignmentAction } from '../actions'
import { RichTextField } from '../../../../../_components/RichTextField'
import { StandardPicker } from '../../../../../_components/StandardPicker'
import { SubmitButton } from '../../../../../_components/interactive'

export const dynamic = 'force-dynamic'

export default async function NewAssignmentPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { course, isTeacher } = await courseCtx(params)
  if (!isTeacher) notFound()
  const rubrics = await listRubrics(course.id)
  const standards = await standardsFor(course.curriculum?.subject, course.curriculum?.grade)
  const action = createAssignmentAction.bind(null, course.id)

  return (
    <div className="lms-stack" style={{ maxWidth: 680 }}>
      <div className="lms-breadcrumb">
        <Link href={`/lms/courses/${course.id}/assignments`}>Assignments</Link> / New
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
          <RichTextField name="instructions" placeholder="Describe the task…" />
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
          <label className="lms-label">
            BC learning standards
            {course.curriculum && (
              <span className="lms-faint" style={{ fontWeight: 400 }}>
                {' '}— {course.curriculum.subject} {course.curriculum.grade}
              </span>
            )}
          </label>
          <StandardPicker available={standards} />
        </div>

        <div className="lms-field">
          <label className="lms-flex" style={{ cursor: 'pointer' }}>
            <input type="checkbox" name="published" defaultChecked />
            <span>Publish immediately (students can see it)</span>
          </label>
        </div>

        <div className="lms-field">
          <label className="lms-flex" style={{ cursor: 'pointer' }}>
            <input type="checkbox" name="draftCoach" defaultChecked />
            <span>Let students ask for feedback on a draft</span>
          </label>
          <p className="lms-muted" style={{ fontSize: 12.5, margin: '4px 0 0' }}>
            Feedback is aligned to this task&apos;s standards and never gives a mark or writes any of the work. Turn it
            off for anything assessing independent, unaided writing.
          </p>
        </div>

        <div className="lms-field">
          <label className="lms-flex" style={{ cursor: 'pointer' }}>
            <input type="checkbox" name="processCapture"  />
            <span>Record how students write this</span>
          </label>
          <p className="lms-muted" style={{ fontSize: 12.5, margin: '4px 0 0' }}>
            Stores time spent, how the length changes, and paste sizes — never the writing itself. Students are told
            before they start. Worth it on substantial work; on a short worksheet it is just surveillance.
          </p>
        </div>

        <div className="lms-field">
          <label className="lms-flex" style={{ cursor: 'pointer' }}>
            <input type="checkbox" name="languageIsAssessed"  />
            <span>The English itself is what this task assesses</span>
          </label>
          <p className="lms-muted" style={{ fontSize: 12.5, margin: '4px 0 0' }}>
            Tick this for reading comprehension, vocabulary, or anything testing whether a student can follow written
            English. Translation is then refused and the student is told why. Leave it clear on subject tasks — a
            student losing marks for misreading a chemistry question is not a chemistry result.
          </p>
        </div>

        <div className="lms-flex" style={{ marginTop: 8 }}>
          <SubmitButton className="lms-btn lms-btn--primary">
            Create assignment
          </SubmitButton>
          <Link href={`/lms/courses/${course.id}/assignments`} className="lms-btn lms-btn--ghost">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
