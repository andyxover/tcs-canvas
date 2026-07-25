import type { CommentDraft, CommentEvidence, CommentDrafter } from '../report-comments'
import { deidentify, type DeidentifiedPacket } from './deidentify'

/**
 * Anthropic-backed drafter.
 *
 * Reads its key from the environment and is never handed one in code. If no key
 * is configured the app does not degrade — the structured drafter remains the
 * default and this one simply reports itself unavailable.
 *
 * Two rules this file exists to enforce:
 *   1. Only the de-identified packet is sent. The student's name is re-inserted
 *      locally, after the response comes back.
 *   2. A failure here never breaks the page. Report writing cannot depend on a
 *      third party being up.
 */

/** Carries a message already written for a teacher to read. */
export class DraftError extends Error {}

function humanError(status: number): string {
  if (status === 401 || status === 403)
    return 'The configured API key was rejected. Check ANTHROPIC_API_KEY in the environment settings.'
  if (status === 429) return 'The provider is rate limiting requests right now. Try again in a moment.'
  if (status === 400) return 'The provider rejected the request. This is a bug on our side, not yours.'
  if (status >= 500) return 'The provider is having trouble. Try again shortly.'
  return `The drafting request failed (status ${status}).`
}

const API = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-5'
const TIMEOUT_MS = 25_000

export function llmConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export function llmModel(): string {
  return process.env.ANTHROPIC_COMMENT_MODEL || DEFAULT_MODEL
}

const SYSTEM = `You draft term report-card comments for a British Columbia school.

You are given de-identified evidence about one student: BC learning standards they
have demonstrated, standards still developing, movement across the term, work
habit counts, and any feedback their teacher wrote. The student is referred to
only as "the student".

Write ONE paragraph, 60-110 words, that a teacher would be willing to sign.

Rules:
- Refer to the learner as "the student" throughout. Never invent a name.
- Only state what the evidence supports. Do not infer effort, attitude,
  behaviour, personality or home circumstances — none of that is in the evidence.
- Name specific learning, not vague praise. Cite standard codes in brackets.
- Where a demonstrated standard carries an "evidencedIn", name that work
  alongside the code. A claim a parent can trace to a specific piece of work is
  worth more than one they have to take on faith.
- Use each standard's own "level" word (emerging / developing / proficient /
  extending) rather than a vaguer synonym, and do not present a standard sitting
  at "emerging" as though it were as close to secure as one at "developing".
- Restate a standard's "text" faithfully. Compress it if you must, but do not
  add a qualifier or shift its meaning.
- If workHabits shows missing or late work, say so plainly in one clause. A
  comment that omits outstanding work is flattering rather than accurate.
- Follow the BC shape: what the student can do, then where the learning is
  heading next.
- For proficiency-scale reporting (K-9) do not mention percentages or letter
  grades. For the Graduation Program (10-12) you may state the standing given.
- Plain language a parent can read. No jargon beyond the standard codes.
- Output the paragraph only. No preamble, no headings, no quotation marks.`

async function callAnthropic(packet: DeidentifiedPacket): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(API, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY as string,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: llmModel(),
        max_tokens: 400,
        system: SYSTEM,
        messages: [{ role: 'user', content: JSON.stringify(packet, null, 2) }],
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      // Full detail to the server log for whoever is debugging; a teacher gets a
      // sentence they can act on. Showing them raw provider JSON is noise at
      // best and leaks request identifiers at worst.
      console.error(`[report-comments] Anthropic API ${res.status}: ${detail.slice(0, 500)}`)
      throw new DraftError(humanError(res.status))
    }
    const json = (await res.json()) as { content?: { type: string; text?: string }[] }
    const text = (json.content ?? [])
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('')
      .trim()
    if (!text) throw new DraftError('The provider returned an empty draft. Try again.')
    return text
  } catch (err) {
    if (err instanceof DraftError) throw err
    if (err instanceof Error && err.name === 'AbortError') {
      throw new DraftError('The drafting request took too long and was stopped.')
    }
    console.error('[report-comments] drafting failed:', err)
    throw new DraftError('Could not reach the drafting provider.')
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Put the student's name back. The model was told to say "the student", so this
 * is a local substitution on text that never carried the name in transit.
 */
function restoreName(text: string, firstName: string): string {
  return text
    .replace(/\bThe student\b/g, firstName)
    .replace(/\bthe student's\b/gi, `${firstName}'s`)
    .replace(/\bthe student\b/g, firstName)
}

export function makeLlmDrafter(rosterNames: string[]): CommentDrafter {
  return {
    id: 'anthropic',
    label: `Language model (${llmModel()})`,
    async draft(ev: CommentEvidence): Promise<CommentDraft> {
      const packet = deidentify(ev, rosterNames)
      const cautions: string[] = [
        'Drafted by a language model from de-identified evidence. Read it against the evidence below before signing.',
      ]
      if (ev.notAssessed.length > 0) {
        cautions.push(
          `${ev.notAssessed.length} of the course's standards have no recorded judgement, so the comment cannot speak to them.`,
        )
      }
      const raw = await callAnthropic(packet)
      return {
        body: restoreName(raw, ev.student.firstName),
        citedStandardIds: [...ev.strengths, ...ev.growing]
          .filter((s) => raw.includes(s.code))
          .map((s) => s.standardId),
        cautions,
        drafterId: 'anthropic',
      }
    },
  }
}

/** The exact payload that would be sent, for the teacher to inspect first. */
export function previewPayload(ev: CommentEvidence, rosterNames: string[]): DeidentifiedPacket {
  return deidentify(ev, rosterNames)
}
