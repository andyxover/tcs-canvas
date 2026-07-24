import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getViewer } from '@/lib/session'
import { getAssignment, getCourse, getQuiz } from '@/lib/store'
import { standardsFor } from '@/lib/bc-curriculum'
import { updateQuizAction } from '../../actions'
import { QuizBuilder } from '../../_components/QuizBuilder'
import { RichTextEditor } from '../../../../../_components/RichTextEditor'
import { StandardPicker } from '../../../../../_components/StandardPicker'

export const dynamic = 'force-dynamic'

export default async function EditQuizPage({
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
  const quiz = getQuiz(assignmentId)
  if (!a || a.courseId !== courseId || a.submissionType !== 'quiz' || !quiz) notFound()

  const action = updateQuizAction.bind(null, course.id, a.id)
  const categories = course.gradeSettings.categories
  const standards = standardsFor(course.curriculum?.subject, course.curriculum?.grade)
  const dueLocal = a.dueAt ? a.dueAt.slice(0, 16) : ''

  return (
    <div className="lms-stack" style={{ maxWidth: 720 }}>
      <div className="lms-breadcrumb">
        <Link href={`/courses/${course.id}/assignments`}>Assignments</Link> /{' '}
        <Link href={`/courses/${course.id}/assignments/${a.id}`}>{a.title}</Link> / Edit
      </div>
      <h1 className="lms-h1">Edit quiz</h1>

      <form action={action} className="lms-stack">
        <div className="lms-card lms-card--pad">
          <div className="lms-field">
            <label className="lms-label" htmlFor="title">
              Title
            </label>
            <input id="title" name="title" className="lms-input" defaultValue={a.title} required />
          </div>

          <div className="lms-field">
            <label className="lms-label">Instructions (optional)</label>
            <RichTextEditor name="instructions" defaultHTML={a.instructions} placeholder="Any notes before the questions…" minHeight={70} />
          </div>

          <div className="lms-form-row">
            <div className="lms-field">
              <label className="lms-label" htmlFor="category">
                Category
              </label>
              <select id="category" name="category" className="lms-select" defaultValue={a.category}>
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
              <input id="points" name="points" type="number" min={0} max={1000} defaultValue={a.points} className="lms-input" />
            </div>
          </div>

          <div className="lms-field">
            <label className="lms-label" htmlFor="dueAt">
              Due date
            </label>
            <input id="dueAt" name="dueAt" type="datetime-local" defaultValue={dueLocal} className="lms-input" />
          </div>

          <div className="lms-field" style={{ marginBottom: 0 }}>
            <label className="lms-flex" style={{ cursor: 'pointer' }}>
              <input type="checkbox" name="published" defaultChecked={a.published} />
              <span>Published</span>
            </label>
          </div>
        </div>

        <div className="lms-card lms-card--pad">
          <label className="lms-label">BC learning standards</label>
          <StandardPicker available={standards} defaultSelected={a.standardIds ?? []} />
        </div>

        <h2 style={{ fontSize: 15, fontWeight: 700, margin: '4px 0 0' }}>Questions</h2>
        <QuizBuilder defaultQuestions={quiz.questions} />

        <div className="lms-flex" style={{ marginTop: 4 }}>
          <button type="submit" className="lms-btn lms-btn--primary">
            Save quiz
          </button>
          <Link href={`/courses/${course.id}/assignments/${a.id}`} className="lms-btn lms-btn--ghost">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
