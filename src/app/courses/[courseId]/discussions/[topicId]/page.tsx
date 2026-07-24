import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getViewer } from '@/lib/session'
import { getCourse, getDiscussionTopic, getPerson, listDiscussionPosts } from '@/lib/store'
import type { DiscussionPost } from '@/lib/types'
import { Avatar, RichText, fmtRelative } from '../../../../_components/ui'
import { addPostAction } from '../actions'

export const dynamic = 'force-dynamic'

export default async function TopicPage({
  params,
}: {
  params: Promise<{ courseId: string; topicId: string }>
}) {
  const { courseId, topicId } = await params
  const course = getCourse(courseId)
  const topic = getDiscussionTopic(topicId)
  if (!course || !topic || topic.courseId !== courseId) notFound()
  const viewer = await getViewer()
  const author = getPerson(topic.authorId)
  const posts = listDiscussionPosts(topicId)
  const roots = posts.filter((p) => !p.parentId)

  return (
    <div className="lms-stack" style={{ maxWidth: 740 }}>
      <div className="lms-breadcrumb">
        <Link href={`/courses/${courseId}/discussions`}>Discussions</Link> / {topic.title}
      </div>

      <div className="lms-card lms-card--pad">
        <div className="lms-flex" style={{ marginBottom: 8 }}>
          {author && <Avatar person={author} size={32} />}
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{topic.title}</div>
            <div className="lms-row__meta">
              {author?.name} · {fmtRelative(topic.postedAt)}
            </div>
          </div>
        </div>
        {topic.body && <RichText html={topic.body} />}
      </div>

      <form action={addPostAction.bind(null, courseId, topicId, viewer.person.id)} className="lms-card lms-card--pad">
        <input type="hidden" name="parentId" value="" />
        <textarea name="body" className="lms-textarea" placeholder="Add to the discussion…" required style={{ minHeight: 80 }} />
        <button type="submit" className="lms-btn lms-btn--primary" style={{ marginTop: 10 }}>
          Reply
        </button>
      </form>

      <div className="lms-stack">
        {roots.map((post) => (
          <PostThread
            key={post.id}
            post={post}
            replies={posts.filter((p) => p.parentId === post.id)}
            courseId={courseId}
            topicId={topicId}
            viewerId={viewer.person.id}
          />
        ))}
      </div>
    </div>
  )
}

function PostThread({
  post,
  replies,
  courseId,
  topicId,
  viewerId,
}: {
  post: DiscussionPost
  replies: DiscussionPost[]
  courseId: string
  topicId: string
  viewerId: string
}) {
  const author = getPerson(post.authorId)
  return (
    <div className="lms-card lms-card--pad">
      <div className="lms-flex" style={{ marginBottom: 6 }}>
        {author && <Avatar person={author} size={28} />}
        <div className="lms-row__meta">
          <strong style={{ color: 'var(--lms-ink)' }}>{author?.name}</strong> · {fmtRelative(post.postedAt)}
        </div>
      </div>
      <p style={{ margin: '0 0 10px' }}>{post.body}</p>

      {replies.length > 0 && (
        <div style={{ borderLeft: '2px solid var(--lms-line)', paddingLeft: 14, marginBottom: 10 }} className="lms-stack">
          {replies.map((r) => {
            const ra = getPerson(r.authorId)
            return (
              <div key={r.id}>
                <div className="lms-row__meta" style={{ marginBottom: 2 }}>
                  <strong style={{ color: 'var(--lms-ink)' }}>{ra?.name}</strong> · {fmtRelative(r.postedAt)}
                </div>
                <p style={{ margin: 0 }}>{r.body}</p>
              </div>
            )
          })}
        </div>
      )}

      <details>
        <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--lms-ink-soft)' }}>Reply</summary>
        <form action={addPostAction.bind(null, courseId, topicId, viewerId)} className="lms-flex" style={{ marginTop: 8, gap: 8 }}>
          <input type="hidden" name="parentId" value={post.id} />
          <input name="body" className="lms-input" placeholder="Write a reply…" required />
          <button type="submit" className="lms-btn lms-btn--sm lms-btn--primary">
            Send
          </button>
        </form>
      </details>
    </div>
  )
}
