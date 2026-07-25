import { courseCtx } from '../_shared'
import { RichText } from '../../../../_components/ui'
import { RichTextField } from '../../../../_components/RichTextField'
import { saveSyllabusAction } from './actions'
import { SubmitButton } from '../../../../_components/interactive'

export const dynamic = 'force-dynamic'

export default async function SyllabusPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { course, isTeacher } = await courseCtx(params)

  return (
    <div className="lms-stack">
      <h1 className="lms-h1">Syllabus</h1>

      {isTeacher && (
        <details className="lms-card lms-card--pad">
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Edit syllabus</summary>
          <form action={saveSyllabusAction.bind(null, course.id)} className="lms-stack" style={{ marginTop: 12 }}>
            <RichTextField name="syllabus" defaultHTML={course.syllabus} placeholder="Write the course syllabus…" minHeight={200} />
            <SubmitButton className="lms-btn lms-btn--primary" style={{ alignSelf: 'flex-start' }}>
              Save syllabus
            </SubmitButton>
          </form>
        </details>
      )}

      <div className="lms-card lms-card--pad">
        {course.syllabus ? <RichText html={course.syllabus} /> : <span className="lms-muted">No syllabus yet.</span>}
      </div>
    </div>
  )
}
