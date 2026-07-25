'use client'

import { useActionState } from 'react'
import { SubmitButton } from '../../_components/interactive'
import { inspectDigestPayloadAction, writeDigestAction, type DigestState } from './actions'

const EMPTY: DigestState = { status: 'idle' }

/**
 * The readable version, in the family's language.
 *
 * Rendered ABOVE the record but generated from it, and the record stays on the
 * page underneath either way. If this fails, or is never configured, the family
 * loses readability and not one fact — which is the only arrangement that makes
 * a machine-written note to a parent defensible.
 */
export function WrittenUpdate({
  studentId,
  language,
  configured,
}: {
  studentId: string
  language: string
  configured: boolean
}) {
  const [state, run, pending] = useActionState(writeDigestAction.bind(null, studentId), EMPTY)
  const [peek, inspect, peeking] = useActionState(inspectDigestPayloadAction.bind(null, studentId), EMPTY)
  const shown = state.status !== 'idle' ? state : peek

  return (
    <section className="lms-ai" data-panel="family-digest">
      <div className="lms-between lms-wrap" style={{ gap: 10 }}>
        <div>
          <strong style={{ fontSize: 14 }}>A written update you can read</strong>
          <div className="lms-muted" style={{ fontSize: 12.5 }}>
            The full record stays below in English — this is the same information, written out.
          </div>
        </div>
        <div className="lms-flex lms-wrap lms-gap-sm">
          <form action={run}>
            <SubmitButton
              className={`lms-btn lms-btn--sm ${configured ? 'lms-btn--primary' : ''}`}
              disabled={!configured || pending}
            >
              {configured ? `Write it in ${language}` : 'Written updates not configured'}
            </SubmitButton>
          </form>
          <form action={inspect}>
            <SubmitButton className="lms-btn lms-btn--sm lms-btn--ghost" disabled={peeking}>
              See what would be sent
            </SubmitButton>
          </form>
        </div>
      </div>

      {shown.message && (
        <div
          className={`lms-callout ${shown.status === 'error' ? 'lms-callout--warn' : ''}`}
          style={{ marginTop: 10 }}
        >
          {shown.message}
        </div>
      )}

      {shown.written && (
        <div className="lms-ai__draft">
          {shown.written.courses.map((c) => (
            <div key={c.subject} style={{ marginBottom: 14 }}>
              <strong style={{ fontSize: 14 }}>{c.subject}</strong>
              <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{c.body}</p>
            </div>
          ))}
          {shown.written.cautions.map((c, i) => (
            <div key={i} className="lms-muted" style={{ fontSize: 12 }}>
              {c}
            </div>
          ))}
        </div>
      )}

      {shown.payload && (
        <details className="lms-evidence-panel" style={{ marginTop: 10 }}>
          <summary>What leaves the building — the exact request</summary>
          <p className="lms-muted" style={{ fontSize: 12, margin: '8px 0' }}>
            Your child’s name is not sent, and classmates’ names in teacher comments are replaced with{' '}
            <code className="lms-stdpick__code">[student]</code>. The name is put back on this device after the reply
            comes back.
          </p>
          <pre className="lms-payload">{shown.payload}</pre>
        </details>
      )}
    </section>
  )
}
