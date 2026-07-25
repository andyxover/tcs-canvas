import { getPerson, listAnnouncements } from '@/lib/store'
import { courseCtx } from '../_shared'
import { Avatar, EmptyState, InlineDelete, RichText, fmtRelative } from '../../../../_components/ui'
import { createAnnouncementAction, deleteAnnouncementAction } from './actions'
import { RichTextField } from '../../../../_components/RichTextField'
import { SubmitButton } from '../../../../_components/interactive'

export const dynamic = 'force-dynamic'

export default async function AnnouncementsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { course, viewer, isTeacher } = await courseCtx(params)
  const announcements = await listAnnouncements(course.id)

  return (
    <div className="lms-stack">
      <h1 className="lms-h1">Announcements</h1>

      {isTeacher && (
        <details className="lms-card lms-card--pad">
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>+ New announcement</summary>
          <form action={createAnnouncementAction.bind(null, course.id, viewer.person.id)} className="lms-stack" style={{ marginTop: 12 }}>
            <input name="title" className="lms-input" placeholder="Title" required />
            <RichTextField name="body" placeholder="Message to the class…" minHeight={90} />
            <SubmitButton className="lms-btn lms-btn--primary" style={{ alignSelf: 'flex-start' }}>
              Post
            </SubmitButton>
          </form>
        </details>
      )}

      {announcements.length === 0 ? (
        <EmptyState icon="📣" title="No announcements" hint="Nothing posted yet." />
      ) : (
        <div className="lms-stack">
          {await Promise.all(announcements.map(async (a) => {
            const author = await getPerson(a.authorId)
            return (
              <div key={a.id} className="lms-card lms-card--pad">
                <div className="lms-between" style={{ marginBottom: 8, alignItems: 'flex-start' }}>
                  <div className="lms-flex">
                    {author && <Avatar person={author} size={30} />}
                    <div>
                      <div style={{ fontWeight: 700 }}>{a.title}</div>
                      <div className="lms-row__meta">
                        {author?.name} · {fmtRelative(a.postedAt)}
                      </div>
                    </div>
                  </div>
                  {isTeacher && (
                    <InlineDelete action={deleteAnnouncementAction.bind(null, course.id, a.id)} confirm="Delete this announcement?" />
                  )}
                </div>
                <RichText html={a.body} />
              </div>
            )
          }))}
        </div>
      )}
    </div>
  )
}
