'use client'

import { useState } from 'react'
import { SubmitButton } from '../../../../_components/interactive'
import { saveCommentAction } from './actions'

/**
 * The teacher's comment box.
 *
 * Starts from the draft but is never locked to it: the whole point is that what
 * gets saved is the teacher's text, not the machine's. "Reset to draft" is there
 * so discarding an edit is cheap, which is what makes people willing to edit
 * freely in the first place.
 */
export function CommentEditor({
  courseId,
  studentId,
  draft,
  drafterId,
  saved,
  savedAt,
}: {
  courseId: string
  studentId: string
  draft: string
  drafterId: string
  saved: string | null
  savedAt: string | null
}) {
  const [body, setBody] = useState(saved ?? draft)
  const edited = body.trim() !== draft.trim()
  const words = body.trim() ? body.trim().split(/\s+/).length : 0

  return (
    <form action={saveCommentAction.bind(null, courseId, studentId)} className="lms-stack" style={{ gap: 8 }}>
      <input type="hidden" name="draft" value={draft} />
      <input type="hidden" name="drafterId" value={drafterId} />
      <textarea
        name="body"
        className="lms-textarea"
        style={{ minHeight: 130 }}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        aria-label="Report card comment"
      />
      <div className="lms-between lms-wrap" style={{ gap: 10 }}>
        <div className="lms-muted" style={{ fontSize: 12.5 }}>
          {words} words
          {edited ? ' · edited' : ' · unchanged from draft'}
          {savedAt && ` · saved ${new Date(savedAt).toLocaleDateString('en-CA')}`}
        </div>
        <div className="lms-flex lms-gap-sm">
          {edited && (
            <button type="button" className="lms-btn lms-btn--sm" onClick={() => setBody(draft)}>
              Reset to draft
            </button>
          )}
          <SubmitButton className="lms-btn lms-btn--primary lms-btn--sm">
            {saved ? 'Update comment' : 'Save comment'}
          </SubmitButton>
        </div>
      </div>
    </form>
  )
}
