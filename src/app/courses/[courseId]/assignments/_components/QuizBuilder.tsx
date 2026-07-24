'use client'

import { useState } from 'react'

type Kind = 'mc' | 'tf'
interface Q {
  kind: Kind
  prompt: string
  options: string[]
  correctIndex: number
}

function blankMc(): Q {
  return { kind: 'mc', prompt: '', options: ['', '', ''], correctIndex: 0 }
}

/**
 * Renders the quiz questions as real, named form fields so the parent form's
 * server action (createQuizAction) can parse them from FormData. State is local
 * and controlled; the field names encode the question/option indices.
 */
export function QuizBuilder() {
  const [questions, setQuestions] = useState<Q[]>([blankMc()])

  const update = (qi: number, patch: Partial<Q>) =>
    setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, ...patch } : q)))

  function setKind(qi: number, kind: Kind) {
    if (kind === 'tf') update(qi, { kind, options: ['True', 'False'], correctIndex: 0 })
    else update(qi, { kind, options: ['', '', ''], correctIndex: 0 })
  }

  function setOption(qi: number, oi: number, value: string) {
    setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) } : q)))
  }

  function addOption(qi: number) {
    setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, options: [...q.options, ''] } : q)))
  }

  function removeOption(qi: number, oi: number) {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qi || q.options.length <= 2) return q
        const options = q.options.filter((_, j) => j !== oi)
        let correctIndex = q.correctIndex
        if (oi === correctIndex) correctIndex = 0
        else if (oi < correctIndex) correctIndex -= 1
        return { ...q, options, correctIndex }
      }),
    )
  }

  const addQuestion = () => setQuestions((qs) => [...qs, blankMc()])
  const removeQuestion = (qi: number) => setQuestions((qs) => (qs.length <= 1 ? qs : qs.filter((_, i) => i !== qi)))

  return (
    <div className="lms-stack">
      <input type="hidden" name="qCount" value={questions.length} />
      {questions.map((q, qi) => (
        <fieldset key={qi} className="lms-card lms-card--pad" style={{ border: '1px solid var(--lms-line)', margin: 0 }}>
          <div className="lms-between" style={{ marginBottom: 10 }}>
            <legend style={{ fontWeight: 700, padding: 0 }}>Question {qi + 1}</legend>
            <div className="lms-flex lms-gap-sm">
              <select
                className="lms-select"
                style={{ width: 'auto' }}
                name={`q-${qi}-kind`}
                value={q.kind}
                onChange={(e) => setKind(qi, e.target.value as Kind)}
              >
                <option value="mc">Multiple choice</option>
                <option value="tf">True / False</option>
              </select>
              {questions.length > 1 && (
                <button type="button" className="lms-btn lms-btn--ghost lms-btn--sm" onClick={() => removeQuestion(qi)}>
                  Remove
                </button>
              )}
            </div>
          </div>

          <input type="hidden" name={`q-${qi}-optCount`} value={q.options.length} />
          <input
            className="lms-input"
            name={`q-${qi}-prompt`}
            value={q.prompt}
            onChange={(e) => update(qi, { prompt: e.target.value })}
            placeholder="Question prompt"
            style={{ marginBottom: 10 }}
          />

          <div className="lms-stack" style={{ gap: 8 }}>
            {q.options.map((opt, oi) => (
              <div key={oi} className="lms-flex" style={{ gap: 8 }}>
                <label className="lms-flex" style={{ gap: 6, whiteSpace: 'nowrap', cursor: 'pointer' }} title="Mark as the correct answer">
                  <input
                    type="radio"
                    name={`q-${qi}-correct`}
                    value={oi}
                    checked={q.correctIndex === oi}
                    onChange={() => update(qi, { correctIndex: oi })}
                  />
                  <span className="lms-faint" style={{ fontSize: 12 }}>
                    correct
                  </span>
                </label>
                {q.kind === 'tf' ? (
                  <input className="lms-input" value={opt} readOnly />
                ) : (
                  <>
                    <input
                      className="lms-input"
                      name={`q-${qi}-opt-${oi}`}
                      value={opt}
                      onChange={(e) => setOption(qi, oi, e.target.value)}
                      placeholder={`Option ${oi + 1}`}
                    />
                    {q.options.length > 2 && (
                      <button type="button" className="lms-btn lms-btn--ghost lms-btn--sm" onClick={() => removeOption(qi, oi)} aria-label="Remove option">
                        ✕
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {q.kind === 'mc' && (
            <button type="button" className="lms-btn lms-btn--ghost lms-btn--sm" style={{ marginTop: 8 }} onClick={() => addOption(qi)}>
              + Add option
            </button>
          )}
        </fieldset>
      ))}

      <button type="button" className="lms-btn lms-btn--sm" style={{ alignSelf: 'flex-start' }} onClick={addQuestion}>
        + Add question
      </button>
    </div>
  )
}
