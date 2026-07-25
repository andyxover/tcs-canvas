import type { CommentDraft, CommentEvidence, CommentDrafter } from '../report-comments'
import { deidentify, type DeidentifiedPacket } from './deidentify'
import { DraftError, askModel, llmConfigured, llmModel } from '../ai/anthropic'

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
 *
 * Transport, timeouts and error mapping live in ../ai/anthropic — this file is
 * only the prompt and the de-identification boundary.
 */

// Re-exported because callers (server actions, the reports page) import these
// from the drafter they are using rather than reaching for the transport.
export { llmConfigured, llmModel, DraftError }

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
      const raw = await askModel(SYSTEM, packet, { maxTokens: 400, label: 'report-comments' })
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
