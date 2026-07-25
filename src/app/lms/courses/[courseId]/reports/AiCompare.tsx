'use client'

import { useActionState } from 'react'
import { SubmitButton } from '../../../../_components/interactive'
import { aiDraftAction, inspectPayloadAction, type AiDraftState } from './ai-actions'

const EMPTY: AiDraftState = { status: 'idle' }

/**
 * Side-by-side comparison, on demand.
 *
 * The comparison is the point: the structured draft is already in the editor, so
 * the only question worth answering is whether a model's version is enough better
 * to justify sending evidence to a third party. Showing them together, over real
 * students, is the cheapest way to decide that — and "Inspect payload" answers
 * it without sending anything at all.
 */
export function AiCompare({
  courseId,
  studentId,
  configured,
  onAdopt,
}: {
  courseId: string
  studentId: string
  configured: boolean
  onAdopt: (text: string) => void
}) {
  const [state, run, pending] = useActionState(aiDraftAction.bind(null, courseId, studentId), EMPTY)
  const [peek, inspect, peeking] = useActionState(
    inspectPayloadAction.bind(null, courseId, studentId),
    EMPTY,
  )
  const shown = state.status !== 'idle' ? state : peek

  return (
    <div className="lms-ai" data-panel="report-draft">
      <div className="lms-flex lms-wrap lms-gap-sm">
        <form action={run}>
          <SubmitButton className="lms-btn lms-btn--sm" disabled={!configured || pending}>
            {configured ? 'Draft with a language model' : 'Language model not configured'}
          </SubmitButton>
        </form>
        <form action={inspect}>
          <SubmitButton className="lms-btn lms-btn--sm lms-btn--ghost" disabled={peeking}>
            Inspect what would be sent
          </SubmitButton>
        </form>
      </div>

      {shown.message && (
        <div
          className={`lms-callout ${shown.status === 'error' ? 'lms-callout--warn' : ''}`}
          style={{ marginTop: 10 }}
        >
          {shown.message}
        </div>
      )}

      {shown.status === 'ready' && shown.body && (
        <div className="lms-ai__draft">
          <div className="lms-between lms-wrap" style={{ marginBottom: 6 }}>
            <strong style={{ fontSize: 13 }}>Language model draft</strong>
            <button type="button" className="lms-btn lms-btn--sm lms-btn--primary" onClick={() => onAdopt(shown.body!)}>
              Use this draft
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>{shown.body}</p>
          {shown.cautions?.map((c, i) => (
            <div key={i} className="lms-muted" style={{ fontSize: 12, marginTop: 6 }}>
              {c}
            </div>
          ))}
        </div>
      )}

      {shown.payload && (
        <details className="lms-evidence-panel" style={{ marginTop: 10 }}>
          <summary>What leaves the building — the exact request payload</summary>
          <p className="lms-muted" style={{ fontSize: 12, margin: '8px 0' }}>
            No student name appears anywhere below. Names typed into assignment titles or your feedback are
            replaced with <code className="lms-stdpick__code">[student]</code>. The real name is put back locally
            after the response returns.
          </p>
          <pre className="lms-payload">{shown.payload}</pre>
        </details>
      )}
    </div>
  )
}
