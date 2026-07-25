'use client'

import { useActionState, useState, useTransition } from 'react'
import { SubmitButton } from '../../../../../_components/interactive'
import { LANGUAGES, type LanguageCode } from '@/lib/scaffolding'
import {
  inspectScaffoldPayloadAction,
  scaffoldAction,
  setLanguageAction,
  type ScaffoldState,
} from './scaffold-actions'

const EMPTY: ScaffoldState = { status: 'idle' }

/**
 * Understanding the task, for a student working in an additional language.
 *
 * The translation is rendered BELOW the English instructions and never in place
 * of them. That placement is the feature, not a layout choice: the student is
 * examined in English and their teacher's feedback is in English, so a scaffold
 * that hides the original produces someone who cannot work without it.
 */
export function Scaffold({
  courseId,
  assignmentId,
  configured,
  initialLanguage,
}: {
  courseId: string
  assignmentId: string
  configured: boolean
  initialLanguage: LanguageCode | null
}) {
  const [lang, setLang] = useState<LanguageCode>(initialLanguage ?? 'zh-TW')
  const [, startTransition] = useTransition()
  const [state, run, pending] = useActionState(scaffoldAction.bind(null, courseId, assignmentId, lang), EMPTY)
  const [peek, inspect, peeking] = useActionState(
    inspectScaffoldPayloadAction.bind(null, courseId, assignmentId, lang),
    EMPTY,
  )
  const shown = state.status !== 'idle' ? state : peek
  const sc = shown.scaffold

  return (
    <section className="lms-ai" data-panel="scaffold" style={{ marginTop: 14 }}>
      <div className="lms-between lms-wrap" style={{ gap: 10 }}>
        <div>
          <strong style={{ fontSize: 14 }}>Not sure what this is asking?</strong>
          <div className="lms-muted" style={{ fontSize: 12.5 }}>
            The English above stays as it is — this is added underneath it.
          </div>
        </div>
        <div className="lms-flex lms-wrap lms-gap-sm">
          <select
            className="lms-select lms-select--sm"
            value={lang}
            aria-label="Language"
            onChange={(e) => {
              const next = e.target.value as LanguageCode
              setLang(next)
              // Remembered so a student who needs this does not re-pick it on
              // every task for the rest of the year.
              startTransition(() => void setLanguageAction(next))
            }}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <form action={run}>
            <SubmitButton className={`lms-btn lms-btn--sm ${configured ? 'lms-btn--primary' : ''}`} disabled={!configured || pending}>
              {configured ? 'Explain in my language' : 'Translation not configured'}
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

      {sc && (
        <div className="lms-ai__draft">
          <div className="lms-muted" style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.05em' }}>
            What the task is asking
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{sc.task}</p>

          {sc.rubric.length > 0 && (
            <>
              <div
                className="lms-muted"
                style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 14 }}
              >
                What a strong piece of work looks like
              </div>
              <div className="lms-stack" style={{ gap: 6, marginTop: 6 }}>
                {sc.rubric.map((r, i) => (
                  <div key={i} style={{ fontSize: 13.5, lineHeight: 1.7 }}>
                    <strong>{r.criterion}</strong> — {r.asks}
                  </div>
                ))}
              </div>
            </>
          )}

          {sc.glossary.length > 0 && (
            <>
              <div
                className="lms-muted"
                style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 14 }}
              >
                Words to know — these stay in English
              </div>
              <dl className="lms-glossary">
                {sc.glossary.map((g) => (
                  <div key={g.term} className="lms-glossary__row">
                    {/* The English term is the heading, deliberately. It is the
                        word on the exam; the gloss is support, not a swap. */}
                    <dt>{g.term}</dt>
                    <dd>
                      {g.english && <span className="lms-glossary__en">{g.english}</span>}
                      {g.translated && <span className="lms-glossary__tr">{g.translated}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          {sc.cautions.map((c, i) => (
            <div key={i} className="lms-muted" style={{ fontSize: 12, marginTop: 10 }}>
              {c}
            </div>
          ))}
        </div>
      )}

      {shown.payload && (
        <details className="lms-evidence-panel" style={{ marginTop: 10 }}>
          <summary>What leaves the building — the exact request</summary>
          <p className="lms-muted" style={{ fontSize: 12, margin: '8px 0' }}>
            Only the task your teacher wrote, which is the same for the whole class. Nothing about you, nothing you have
            written, and no marks.
          </p>
          <pre className="lms-payload">{shown.payload}</pre>
        </details>
      )}
    </section>
  )
}
