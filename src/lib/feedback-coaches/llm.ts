import type { DraftContext, DraftFeedback, FeedbackCoach } from '../draft-feedback'
import { askModel } from '../ai/anthropic'
import { scrubNames } from '../ai/scrub'

/**
 * Model-backed formative coach.
 *
 * This one sends more than the report drafter does: the student's draft in full.
 * That is a genuine escalation and is treated as one — the draft is scrubbed of
 * roster names, the payload is inspectable before anything is sent, and the
 * whole feature is off unless a teacher turns it on for the assignment.
 *
 * The prompt below is most of the actual engineering. Two rules carry the
 * design, and both are stated repeatedly because they are exactly what a helpful
 * assistant drifts away from: do not grade, and do not write the work.
 */

export interface DeidentifiedDraftPacket {
  subject: string
  gradeLevel: string
  task: { title: string; instructions: string; points: number }
  standards: {
    code: string
    kind: string
    text: string
    currentLevel: string | null
    nextLevel: { label: string; description: string } | null
    keywordsAppearInDraft: boolean
  }[]
  rubric: { criterion: string; levels: { label: string; description: string }[] }[] | null
  draft: string
  draftWords: number
  priorTeacherFeedback: string[]
}

export function deidentifyDraft(ctx: DraftContext, rosterNames: string[]): DeidentifiedDraftPacket {
  const clean = (t: string) => scrubNames(t, rosterNames)
  return {
    subject: ctx.course.curriculum?.subject ?? ctx.course.name,
    gradeLevel: ctx.course.curriculum?.grade ?? '',
    task: {
      title: clean(ctx.assignment.title),
      instructions: clean(ctx.assignment.task),
      points: ctx.assignment.points,
    },
    standards: ctx.standards.map((s) => ({
      code: s.code,
      kind: s.kind,
      text: s.text,
      currentLevel: s.currentLevel,
      nextLevel: s.nextLevel ? { label: s.nextLevel.label, description: s.nextLevel.description } : null,
      keywordsAppearInDraft: s.mentioned,
    })),
    rubric: ctx.rubric
      ? ctx.rubric.map((c) => ({
          criterion: c.name,
          levels: c.levels.map((l) => ({ label: l.label, description: l.description })),
        }))
      : null,
    // The student's own words. Scrubbed of roster names, but this is the one
    // field where the content itself is the person's work.
    draft: clean(ctx.draft.text),
    draftWords: ctx.draft.words,
    priorTeacherFeedback: ctx.priorFeedback.map((f) => clean(f.feedback)),
  }
}

const SYSTEM = `You give formative feedback on a student's DRAFT for a British Columbia school.
You are speaking to the student, before they hand the work in.

You receive: the task, the BC learning standards it is assessed against, where
this student currently sits on each of those standards, what the next level up
asks for, the rubric if there is one, the draft itself, and any feedback their
teacher gave on earlier work.

TWO ABSOLUTE RULES.

1. NEVER GRADE. Do not state or imply a score, mark, percentage, letter grade,
   or proficiency level for this draft. Do not say the work "is at Proficient"
   or "would get". You are not the assessor — their teacher is. You may say what
   the next level asks for, because that is the standard's own wording.

2. NEVER DO THE WORK. Do not write sentences for them to paste. Do not supply
   the missing answer, example, calculation, thesis, topic sentence, or
   conclusion. Do not rewrite their prose. If a gap exists, name the gap and ask
   the question that would lead them to fill it themselves. A student must not be
   able to assemble a better submission by copying your output.

How to write it:
- Address the student as "you". Warm, direct, not effusive. No praise sandwich.
- Anchor every point in THEIR draft. Quote a short phrase of theirs (under eight
  words) so they can find the spot. Never invent a quotation.
- Tie points to the standards by code, e.g. (SCI9-CC-3).
- "keywordsAppearInDraft" is a crude word-match hint, not a judgement. Trust your
  own reading of the draft over it, and never repeat it as a finding.
- If the draft is empty or barely started, say so plainly and point at what the
  task actually asks for. Do not invent strengths.
- Do not contradict the teacher's prior feedback.

Reply with ONLY a JSON object, no prose around it, no code fence:
{"working":[{"code":"STD-CODE or null","text":"one sentence"}],
 "nextMoves":[{"code":"STD-CODE or null","text":"one sentence, ending in a question where natural"}],
 "notYetVisible":["STD-CODE", ...]}

At most 3 items in "working" and 4 in "nextMoves". "notYetVisible" lists codes
the draft does not yet address at all. Each "text" is one sentence a Grade 9
student can read.`

interface RawFeedback {
  working?: { code?: string | null; text?: string }[]
  nextMoves?: { code?: string | null; text?: string }[]
  notYetVisible?: string[]
}

/** Models wrap JSON in fences often enough that not handling it is a bug. */
function parseFeedback(raw: string): RawFeedback | null {
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try {
    return JSON.parse(stripped.slice(start, end + 1)) as RawFeedback
  } catch {
    return null
  }
}

export function makeLlmCoach(rosterNames: string[]): FeedbackCoach {
  return {
    id: 'anthropic',
    label: 'Language model coach',
    async coach(ctx: DraftContext): Promise<DraftFeedback> {
      const packet = deidentifyDraft(ctx, rosterNames)
      const raw = await askModel(SYSTEM, packet, { maxTokens: 900, label: 'draft-feedback' })
      const parsed = parseFeedback(raw)

      const cautions = [
        'Feedback from a language model on your draft. It is not a mark, and your teacher decides what your work is worth.',
      ]
      if (ctx.thin) cautions.push('There is very little written so far, so this can only speak to what is here.')

      // Degrade rather than fail: if the shape came back wrong, the text is
      // still worth showing. Throwing here would lose real feedback over a
      // formatting problem.
      if (!parsed) {
        return {
          working: [],
          nextMoves: [{ text: raw.trim() }],
          notYetVisible: [],
          cautions: [...cautions, 'The response did not come back in the expected shape, so it is shown as written.'],
          coachId: 'anthropic',
        }
      }

      const byCode = new Map(ctx.standards.map((s) => [s.code, s]))
      const note = (n: { code?: string | null; text?: string }) => ({
        code: n.code && byCode.has(n.code) ? n.code : undefined,
        text: (n.text ?? '').trim(),
      })

      return {
        working: (parsed.working ?? []).map(note).filter((n) => n.text),
        nextMoves: (parsed.nextMoves ?? []).map(note).filter((n) => n.text),
        notYetVisible: (parsed.notYetVisible ?? [])
          .map((code) => byCode.get(code))
          .filter((s): s is NonNullable<typeof s> => Boolean(s))
          .map((s) => ({ code: s.code, text: s.text })),
        cautions,
        coachId: 'anthropic',
      }
    },
  }
}

/** Exactly what would be sent, for inspection before anything leaves. */
export function previewDraftPayload(ctx: DraftContext, rosterNames: string[]): DeidentifiedDraftPacket {
  return deidentifyDraft(ctx, rosterNames)
}
