import { getPerson, listRoster } from '@/lib/store'
import { courseCtx } from '../_shared'
import { Avatar, Badge } from '../../../../_components/ui'

export const dynamic = 'force-dynamic'

export default async function PeoplePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { course } = await courseCtx(params)
  const teacher = await getPerson(course.teacherId)
  const roster = await listRoster(course.id)

  return (
    <div className="lms-stack">
      <div className="lms-between">
        <h1 className="lms-h1">People</h1>
        <span className="lms-muted">{roster.length + 1} members</span>
      </div>

      <div className="lms-list">
        {teacher && (
          <div className="lms-row">
            <Avatar person={teacher} size={38} />
            <div className="lms-row__main">
              <div className="lms-row__title">{teacher.name}</div>
              <div className="lms-row__meta">{teacher.email}</div>
            </div>
            <Badge tone="info">Teacher</Badge>
          </div>
        )}
        {roster.map((s) => (
          <div key={s.id} className="lms-row">
            <Avatar person={s} size={38} />
            <div className="lms-row__main">
              <div className="lms-row__title">{s.name}</div>
              <div className="lms-row__meta">{s.email}</div>
            </div>
            <Badge tone="muted">Student</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
