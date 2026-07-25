'use client'

import { useActionState, useState } from 'react'
import { SubmitButton } from '../../../../_components/interactive'
import {
  flagPracticeAction,
  generatePracticeAction,
  inspectPracticePayloadAction,
  type PracticeState,
} from './actions'
import type { PracticeQuestion } from '@/lib/practice'

const EMPTY: PracticeState = { status: 'idle' }

/**
 * One target's worth of practice.
 *
 * The interaction rule that shapes this: an answer is never visible until the
 * student has committed to one. Showing the key alongside the question turns
 * practice into reading, and reading feels like learning without being it.
 */
export function PracticePanel({
  courseId,
  standardId,
  code,
  configured,
}: {
  courseId: string
  standardId: string
  code: string
  configured: boolean
}) {
  const [state, run, pending] = useActionState(generatePracticeAction.bind(null, courseId, standardId), EMPTY)
  const [peek, inspect, peeking] = useActionState(
    inspectPracticePayloadAction.bind(null, courseId, standardId),
    EMPTY,
  )
  const shown = state.status !== 'idle' ? state : peek

  return (
    <div className="lms-ai" style={{ marginTop: 10 }}>
      <div className="lms-flex lms-wrap lms-gap-sm">
        <form action={run}>
          {/* Primary only when it can actually do something. A disabled control
              in the loudest style on the page reads as the main call to action
              and then refuses to work — and there is one per standard. */}
          <SubmitButton
            className={`lms-btn lms-btn--sm ${configured ? 'lms-btn--primary' : ''}`}
            disabled={!configured || pending}
          >
            {configured ? `Practise ${code}` : 'Practice questions not configured'}
          </SubmitButton>
        </form>
        <form action={inspect}>
          <SubmitButton className="lms-btn lms-btn--sm lms-btn--ghost" disabled={peeking}>
            See what would be sent
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

      {shown.set && (
        <div className="lms-stack" style={{ gap: 12, marginTop: 12 }}>
          {shown.set.questions.map((q) => (
            <Question key={q.id} q={q} courseId={courseId} />
          ))}
          {shown.set.cautions.map((c, i) => (
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
            Only this standard, your grade level, the level you are working at, and the titles of work already covered
            in class. No name, no writing of yours, no marks.
          </p>
          <pre className="lms-payload">{shown.payload}</pre>
        </details>
      )}
    </div>
  )
}

function Question({ q, courseId }: { q: PracticeQuestion; courseId: string }) {
  const [picked, setPicked] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [hinted, setHinted] = useState(false)
  const [flagging, setFlagging] = useState(false)
  const [flagged, setFlagged] = useState(false)

  const answered = q.kind === 'mc' ? picked !== null : revealed

  return (
    <div className="lms-card lms-card--pad lms-stack" style={{ gap: 8 }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{q.prompt}</div>

      {q.kind === 'mc' && q.options && (
        <div className="lms-stack" style={{ gap: 6 }}>
          {q.options.map((opt, i) => {
            const isAnswer = i === q.answerIndex
            const chosen = picked === i
            // Colour only after a choice: highlighting before it would give the
            // answer away, which is the whole thing this is trying to avoid.
            const tone = picked === null ? '' : isAnswer ? 'lms-practice__opt--right' : chosen ? 'lms-practice__opt--wrong' : ''
            return (
              <button
                key={i}
                type="button"
                className={`lms-practice__opt ${tone}`}
                disabled={picked !== null}
                onClick={() => setPicked(i)}
              >
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {q.kind === 'short' && (
        <>
          <textarea
            className="lms-textarea"
            style={{ minHeight: 80 }}
            placeholder="Write your answer, then check it…"
            aria-label={`Answer for: ${q.prompt}`}
          />
          {!revealed && (
            <button type="button" className="lms-btn lms-btn--sm" onClick={() => setRevealed(true)}>
              Check my answer
            </button>
          )}
        </>
      )}

      {!answered && q.hint && (
        <div>
          {hinted ? (
            <div className="lms-muted" style={{ fontSize: 13 }}>
              Hint: {q.hint}
            </div>
          ) : (
            <button type="button" className="lms-btn lms-btn--sm lms-btn--ghost" onClick={() => setHinted(true)}>
              Stuck? Get a hint
            </button>
          )}
        </div>
      )}

      {answered && (
        <div className="lms-callout">
          {q.kind === 'mc' && (
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>
              {picked === q.answerIndex ? 'Correct.' : 'Not quite.'}
            </div>
          )}
          {q.lookFor && q.lookFor.length > 0 && (
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              A full answer covers: {q.lookFor.join('; ')}.
            </div>
          )}
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>{q.explanation}</div>
        </div>
      )}

      {answered && !flagged && (
        <div>
          {flagging ? (
            <form
              action={async (fd) => {
                await flagPracticeAction(courseId, fd)
                setFlagged(true)
              }}
              className="lms-stack"
              style={{ gap: 6 }}
            >
              <input type="hidden" name="standardCode" value={q.standardCode} />
              <input type="hidden" name="prompt" value={q.prompt} />
              <input
                type="hidden"
                name="given"
                value={
                  q.kind === 'mc' && q.options
                    ? `Marked correct: ${q.options[q.answerIndex ?? 0]}\n\n${q.explanation}`
                    : q.explanation
                }
              />
              <textarea
                name="note"
                className="lms-textarea"
                style={{ minHeight: 60 }}
                placeholder="What looks wrong about it? (optional)"
                aria-label="What looks wrong"
              />
              <div className="lms-flex lms-gap-sm">
                <SubmitButton className="lms-btn lms-btn--sm lms-btn--primary">Send to my teacher</SubmitButton>
                <button type="button" className="lms-btn lms-btn--sm" onClick={() => setFlagging(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="lms-btn lms-btn--sm lms-btn--ghost"
              onClick={() => setFlagging(true)}
            >
              This looks wrong
            </button>
          )}
        </div>
      )}

      {flagged && (
        <div className="lms-muted" style={{ fontSize: 12.5 }}>
          Sent to your teacher. Thanks — that is genuinely useful.
        </div>
      )}
    </div>
  )
}
