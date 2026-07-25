'use client'

import { useState } from 'react'
import { SubmitButton } from '../../../../_components/interactive'
import { saveCommentAction } from './actions'
import { AiCompare } from './AiCompare'

/**
 * The teacher's comment box.
 *
 * Starts from the structured draft but is never locked to it: what gets saved is
 * the teacher's text, not the machine's. "Reset to draft" is here so discarding
 * an edit is cheap, which is what makes people willing to edit freely.
 *
 * The comparison panel lives inside this component rather than beside it so that
 * adopting a model draft is a local state change — one click puts it in the box,
 * still editable, still unsaved until the teacher says so.
 */
export function CommentEditor({
  courseId,
  studentId,
  draft,
  drafterId,
  saved,
  savedAt,
  aiConfigured,
}: {
  courseId: string
  studentId: string
  draft: string
  drafterId: string
  saved: string | null
  savedAt: string | null
  aiConfigured: boolean
}) {
  const [body, setBody] = useState(saved ?? draft)
  const [source, setSource] = useState<'structured' | 'model'>('structured')
  const edited = body.trim() !== draft.trim()
  const words = body.trim() ? body.trim().split(/\s+/).length : 0

  return (
    <div className="lms-stack" style={{ gap: 10 }}>
      <form action={saveCommentAction.bind(null, courseId, studentId)} className="lms-stack" style={{ gap: 8 }}>
        <input type="hidden" name="draft" value={draft} />
        <input type="hidden" name="drafterId" value={source === 'model' ? 'anthropic' : drafterId} />
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
            {source === 'model' && ' · from the language model draft'}
            {savedAt && ` · saved ${new Date(savedAt).toLocaleDateString('en-CA')}`}
          </div>
          <div className="lms-flex lms-gap-sm">
            {edited && (
              <button
                type="button"
                className="lms-btn lms-btn--sm"
                onClick={() => {
                  setBody(draft)
                  setSource('structured')
                }}
              >
                Reset to draft
              </button>
            )}
            <SubmitButton className="lms-btn lms-btn--primary lms-btn--sm">
              {saved ? 'Update comment' : 'Save comment'}
            </SubmitButton>
          </div>
        </div>
      </form>

      <AiCompare
        courseId={courseId}
        studentId={studentId}
        configured={aiConfigured}
        onAdopt={(text) => {
          setBody(text)
          setSource('model')
        }}
      />
    </div>
  )
}
