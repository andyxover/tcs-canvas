import { courseCtx } from '../_shared'
import { RichText } from '../../../_components/ui'

export const dynamic = 'force-dynamic'

export default async function SyllabusPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { course } = await courseCtx(params)
  return (
    <div className="lms-stack">
      <h1 className="lms-h1">Syllabus</h1>
      <div className="lms-card lms-card--pad">
        <RichText html={course.syllabus} />
      </div>
    </div>
  )
}
