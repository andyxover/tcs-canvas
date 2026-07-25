'use client'

import { useActionState } from 'react'
import { SubmitButton } from '../../../../../_components/interactive'
import {
  checklistAction,
  coachAction,
  inspectDraftPayloadAction,
  type CoachState,
} from './coach-actions'

const EMPTY: CoachState = { status: 'idle' }

/**
 * The student's side of formative feedback.
 *
 * Deliberately placed below the response box rather than beside it: the draft is
 * the work, this is a second opinion on the work. Nothing here writes into the
 * textarea — there is no "apply" button and there never should be, because the
 * moment feedback can edit the draft it stops being feedback.
 *
 * Both routes are offered side by side for the same reason the report page shows
 * two drafters: the checklist is free, private and instant, and a student should
 * be able to see what the model adds over it before choosing to send their work.
 */
export function DraftCoach({
  courseId,
  assignmentId,
  studentId,
  modelConfigured,
}: {
  courseId: string
  assignmentId: string
  studentId: string
  modelConfigured: boolean
}) {
  const bound = [courseId, assignmentId, studentId] as const
  const [list, runList, listing] = useActionState(checklistAction.bind(null, ...bound), EMPTY)
  const [ai, runAi, asking] = useActionState(coachAction.bind(null, ...bound), EMPTY)
  const [peek, inspect, peeking] = useActionState(inspectDraftPayloadAction.bind(null, ...bound), EMPTY)

  /**
   * Attach whatever is currently in the response box.
   *
   * The stored submission only updates on turn-in, so without this every request
   * would describe an empty draft — precisely when the student most wants
   * feedback. This panel is a sibling of the turn-in form rather than a child of
   * it, so the value is read from the DOM at submit time instead of being
   * threaded through a shared state owner that nothing else needs.
   */
  const withDraft = (run: (fd: FormData) => void) => (fd: FormData) => {
    const box = document.querySelector<HTMLTextAreaElement>('textarea#text')
    fd.set('draftText', box?.value ?? '')
    run(fd)
  }

  // Last one used wins, so the panel shows what the student just asked for.
  const shown = ai.status !== 'idle' ? ai : peek.status !== 'idle' ? peek : list
  const fb = shown.feedback

  return (
    <section className="lms-ai" style={{ marginTop: 14 }}>
      <div className="lms-between lms-wrap" style={{ gap: 10, marginBottom: 10 }}>
        <div>
          <strong style={{ fontSize: 14 }}>Feedback on your draft</strong>
          <div className="lms-muted" style={{ fontSize: 12.5 }}>
            Not a mark. Your teacher decides what this work is worth.
          </div>
        </div>
        <div className="lms-flex lms-wrap lms-gap-sm">
          <form action={withDraft(runList)}>
            <SubmitButton className="lms-btn lms-btn--sm" disabled={listing}>
              Check against the standards
            </SubmitButton>
          </form>
          <form action={withDraft(runAi)}>
            <SubmitButton className="lms-btn lms-btn--sm lms-btn--primary" disabled={!modelConfigured || asking}>
              {modelConfigured ? 'Ask for feedback on what I wrote' : 'Model feedback not configured'}
            </SubmitButton>
          </form>
        </div>
      </div>

      {shown.message && (
        <div className={`lms-callout ${shown.status === 'error' ? 'lms-callout--warn' : ''}`}>{shown.message}</div>
      )}

      {fb && (
        <div className="lms-ai__draft">
          {fb.working.length > 0 && (
            <>
              <div className="lms-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                What your draft already does
              </div>
              <ul className="lms-coach__list">
                {fb.working.map((n, i) => (
                  <li key={i}>
                    {n.code && <code className="lms-stdpick__code">{n.code}</code>} {n.text}
                  </li>
                ))}
              </ul>
            </>
          )}

          {fb.nextMoves.length > 0 && (
            <>
              <div
                className="lms-muted"
                style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 12 }}
              >
                What would move it forward
              </div>
              <ul className="lms-coach__list">
                {fb.nextMoves.map((n, i) => (
                  <li key={i}>
                    {n.code && <code className="lms-stdpick__code">{n.code}</code>} {n.text}
                  </li>
                ))}
              </ul>
            </>
          )}

          {fb.notYetVisible.length > 0 && (
            <div className="lms-callout" style={{ marginTop: 12 }}>
              <strong style={{ fontSize: 13 }}>Not showing up yet</strong>
              <ul className="lms-coach__list" style={{ marginTop: 6 }}>
                {fb.notYetVisible.map((s) => (
                  <li key={s.code}>
                    <code className="lms-stdpick__code">{s.code}</code> {s.text}
                  </li>
                ))}
              </ul>
              <div className="lms-muted" style={{ fontSize: 12, marginTop: 6 }}>
                This task is assessed on these too — worth a look before you hand it in.
              </div>
            </div>
          )}

          {fb.cautions.map((c, i) => (
            <div key={i} className="lms-muted" style={{ fontSize: 12, marginTop: 8 }}>
              {c}
            </div>
          ))}
        </div>
      )}

      <div className="lms-flex lms-wrap lms-gap-sm" style={{ marginTop: 10 }}>
        <form action={withDraft(inspect)}>
          <SubmitButton className="lms-btn lms-btn--sm lms-btn--ghost" disabled={peeking}>
            See what would be sent
          </SubmitButton>
        </form>
      </div>

      {shown.payload && (
        <details className="lms-evidence-panel" style={{ marginTop: 10 }}>
          <summary>What leaves the building — the exact request</summary>
          <p className="lms-muted" style={{ fontSize: 12, margin: '8px 0' }}>
            Asking the model sends <strong>your draft as written</strong>, along with the task and its standards. Your
            name is not sent, and names are replaced with <code className="lms-stdpick__code">[student]</code>. The
            checklist button sends nothing at all.
          </p>
          <pre className="lms-payload">{shown.payload}</pre>
        </details>
      )}
    </section>
  )
}
