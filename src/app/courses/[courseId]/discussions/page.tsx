import Link from 'next/link'
import { getPerson, listDiscussionPosts, listDiscussionTopics } from '@/lib/store'
import { courseCtx } from '../_shared'
import { Avatar, EmptyState, fmtRelative } from '../../../_components/ui'
import { createTopicAction } from './actions'
import { RichTextField } from '../../../_components/RichTextField'
import { HoverLink, SubmitButton } from '../../../_components/interactive'

export const dynamic = 'force-dynamic'

export default async function DiscussionsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { course, viewer } = await courseCtx(params)
  const topics = listDiscussionTopics(course.id)

  return (
    <div className="lms-stack">
      <h1 className="lms-h1">Discussions</h1>

      <details className="lms-card lms-card--pad">
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>+ New discussion</summary>
        <form action={createTopicAction.bind(null, course.id, viewer.person.id)} className="lms-stack" style={{ marginTop: 12 }}>
          <input name="title" className="lms-input" placeholder="Discussion title" required />
          <RichTextField name="body" placeholder="Kick off the conversation…" minHeight={90} />
          <SubmitButton className="lms-btn lms-btn--primary" style={{ alignSelf: 'flex-start' }}>
            Start discussion
          </SubmitButton>
        </form>
      </details>

      {topics.length === 0 ? (
        <EmptyState icon="💬" title="No discussions yet" hint="Start the first one above." />
      ) : (
        <div className="lms-list">
          {topics.map((t) => {
            const author = getPerson(t.authorId)
            const replies = listDiscussionPosts(t.id).length
            return (
              <HoverLink key={t.id} href={`/courses/${course.id}/discussions/${t.id}`} className="lms-row">
                {author && <Avatar person={author} size={34} />}
                <div className="lms-row__main">
                  <div className="lms-row__title">{t.title}</div>
                  <div className="lms-row__meta">
                    {author?.name} · {fmtRelative(t.postedAt)} · {replies} {replies === 1 ? 'reply' : 'replies'}
                  </div>
                </div>
              </HoverLink>
            )
          })}
        </div>
      )}
    </div>
  )
}
