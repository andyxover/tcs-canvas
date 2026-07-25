import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCourse, getPage } from '@/lib/store'
import { RichText } from '../../../../../_components/ui'

export const dynamic = 'force-dynamic'

export default async function ContentPage({
  params,
}: {
  params: Promise<{ courseId: string; pageId: string }>
}) {
  const { courseId, pageId } = await params
  const course = await getCourse(courseId)
  const page = await getPage(pageId)
  if (!course || !page || page.courseId !== courseId) notFound()

  return (
    <div className="lms-stack" style={{ maxWidth: 760 }}>
      <div className="lms-breadcrumb">
        <Link href={`/lms/courses/${courseId}/modules`}>Modules</Link> / {page.title}
      </div>
      <h1 className="lms-h1">{page.title}</h1>
      <div className="lms-card lms-card--pad">
        <RichText html={page.body} />
      </div>
    </div>
  )
}
