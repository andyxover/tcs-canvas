import Link from 'next/link'
import { notFound } from 'next/navigation'
import { standardsFor } from '@/lib/bc-curriculum'
import { courseCtx } from '../../_shared'
import { createQuizAction } from '../actions'
import { QuizBuilder } from '../_components/QuizBuilder'
import { RichTextField } from '../../../../../_components/RichTextField'
import { StandardPicker } from '../../../../../_components/StandardPicker'
import { SubmitButton } from '../../../../../_components/interactive'

export const dynamic = 'force-dynamic'

export default async function NewQuizPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { course, isTeacher } = await courseCtx(params)
  if (!isTeacher) notFound()
  const action = createQuizAction.bind(null, course.id)
  const categories = course.gradeSettings.categories
  const standards = await standardsFor(course.curriculum?.subject, course.curriculum?.grade)

  return (
    <div className="lms-stack" style={{ maxWidth: 720 }}>
      <div className="lms-breadcrumb">
        <Link href={`/lms/courses/${course.id}/assignments`}>Assignments</Link> / New quiz
      </div>
      <h1 className="lms-h1">New quiz</h1>

      <form action={action} className="lms-stack">
        <div className="lms-card lms-card--pad">
          <div className="lms-field">
            <label className="lms-label" htmlFor="title">
              Title
            </label>
            <input id="title" name="title" className="lms-input" placeholder="e.g. Quiz: Cell Structure" required />
          </div>

          <div className="lms-field">
            <label className="lms-label">Instructions (optional)</label>
            <RichTextField name="instructions" placeholder="Any notes before the questions…" minHeight={70} />
          </div>

          <div className="lms-form-row">
            <div className="lms-field">
              <label className="lms-label" htmlFor="category">
                Category
              </label>
              <select id="category" name="category" className="lms-select" defaultValue={categories.find((c) => /quiz/i.test(c.name))?.name ?? categories[0]?.name}>
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="lms-field">
              <label className="lms-label" htmlFor="points">
                Total points
              </label>
              <input id="points" name="points" type="number" min={0} max={1000} defaultValue={10} className="lms-input" />
            </div>
          </div>

          <div className="lms-field">
            <label className="lms-label" htmlFor="dueAt">
              Due date
            </label>
            <input id="dueAt" name="dueAt" type="datetime-local" className="lms-input" />
          </div>

          <div className="lms-field" style={{ marginBottom: 0 }}>
            <label className="lms-flex" style={{ cursor: 'pointer' }}>
              <input type="checkbox" name="published" defaultChecked />
              <span>Publish immediately</span>
            </label>
          </div>
        </div>

        <div className="lms-card lms-card--pad">
          <label className="lms-label">BC learning standards</label>
          <StandardPicker available={standards} />
        </div>

        <h2 className="lms-dash__h2" style={{ margin: '4px 0 0' }}>Questions</h2>
        <p className="lms-muted" style={{ margin: 0, fontSize: 13 }}>
          Add multiple-choice or true/false questions. Tick the correct answer for each. The quiz auto-grades on submit.
        </p>
        <QuizBuilder />

        <div className="lms-flex" style={{ marginTop: 4 }}>
          <SubmitButton className="lms-btn lms-btn--primary">
            Create quiz
          </SubmitButton>
          <Link href={`/lms/courses/${course.id}/assignments`} className="lms-btn lms-btn--ghost">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
