/**
 * Reading a writing history — facts only.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: nothing here returns a score, a
 * likelihood, a flag, or any field a UI could render as a verdict. Every value
 * below is something that plainly happened — minutes spent, characters pasted,
 * when the work occurred.
 *
 * That is not squeamishness, it is the whole design. AI-detection does not work;
 * it produces false accusations, and it disproportionately flags people writing
 * in an additional language — which at a BC offshore school in Taiwan is most of
 * the student body. A number that looks objective would be acted on as though it
 * were, so the honest move is to refuse to compute one and hand the teacher the
 * evidence instead.
 *
 * Pasting is not misconduct. Plenty of students draft in another app, or write
 * on their phone and paste it in. A large paste is a reason to ask a question,
 * never a finding.
 */

import type { WritingEvent, WritingHistory } from './types'

export interface ProvenanceSummary {
  /** Wall-clock minutes the editor was focused. */
  activeMinutes: number
  /** How long from first keystroke to last, which may be far longer. */
  spanMinutes: number
  /** Distinct working sittings, split on gaps. */
  sittings: number
  pastes: { count: number; largest: number; total: number }
  /** Characters typed, as opposed to pasted in. */
  typed: number
  finalLength: number
  /** Share of the final text that arrived in pastes, 0-1. Null when empty. */
  pastedShare: number | null
  events: WritingEvent[]
}

/** A gap longer than this means the student came back later, not paused. */
const SITTING_GAP_MS = 10 * 60 * 1000

export function summarize(history: WritingHistory | undefined): ProvenanceSummary | null {
  if (!history || history.events.length === 0) return null
  const events = [...history.events].sort((a, b) => a.t - b.t)

  const pasteEvents = events.filter((e) => e.kind === 'paste')
  const pastedTotal = pasteEvents.reduce((n, e) => n + e.delta, 0)
  const typedTotal = events.filter((e) => e.kind === 'type').reduce((n, e) => n + e.delta, 0)
  const finalLength = events[events.length - 1].len

  let sittings = 1
  for (let i = 1; i < events.length; i += 1) {
    if (events[i].t - events[i - 1].t > SITTING_GAP_MS) sittings += 1
  }

  return {
    activeMinutes: Math.round(history.activeMs / 60000),
    spanMinutes: Math.round((events[events.length - 1].t - events[0].t) / 60000),
    sittings,
    pastes: {
      count: pasteEvents.length,
      largest: pasteEvents.reduce((n, e) => Math.max(n, e.delta), 0),
      total: pastedTotal,
    },
    typed: typedTotal,
    finalLength,
    // Against the final length rather than against everything ever entered:
    // "62% of what they handed in was pasted" is the fact a teacher can act on.
    // Capped at 1 because a student can paste, delete, and paste again.
    pastedShare: finalLength > 0 ? Math.min(1, pastedTotal / finalLength) : null,
    events,
  }
}

/**
 * Points for a length-over-time sparkline, normalised to a 0-100 box.
 *
 * Inset on both axes because the most interesting event is often the last one —
 * a paste right before handing in — and at exactly x=100 its marker is half
 * outside the chart.
 */
export function curve(events: WritingEvent[]): { x: number; y: number }[] {
  if (events.length === 0) return []
  const maxT = Math.max(1, events[events.length - 1].t)
  const maxLen = Math.max(1, ...events.map((e) => e.len))
  const PAD = 2
  const span = 100 - PAD * 2
  return events.map((e) => ({
    x: PAD + (e.t / maxT) * span,
    y: PAD + (1 - e.len / maxLen) * span,
  }))
}

export function fmtMinutes(m: number): string {
  if (m < 1) return 'under a minute'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest === 0 ? `${h} hr` : `${h} hr ${rest} min`
}
