import type { PracticeGenerator, PracticePlan, PracticeQuestion, PracticeSet, PracticeTarget } from '../practice'
import { askModel } from '../ai/anthropic'

/**
 * Model-backed practice question generator.
 *
 * The payload here is the least sensitive of the three AI features: a standard's
 * text, a grade level, a proficiency level, and the titles of coursework already
 * seen. No student writing, no name, no grades. It still goes through the same
 * inspect-before-send treatment, because the point of that affordance is that it
 * is always there, not that it is there when we happen to think it matters.
 *
 * The prompt spends most of its length on the answer key, because that is where
 * the damage is. A student practising alone cannot tell a wrong explanation from
 * a right one.
 */

export interface PracticePayload {
  subject: string
  gradeLevel: string
  standard: { code: string; kind: string; text: string; strand?: string }
  studentIsAt: string | null
  nextLevelMeans: string | null
  alreadyCoveredInClass: string[]
}

export function buildPayload(target: PracticeTarget, plan: PracticePlan, seen: string[]): PracticePayload {
  return {
    subject: plan.course.curriculum?.subject ?? plan.course.name,
    gradeLevel: plan.course.curriculum?.grade ?? '',
    standard: { code: target.code, kind: target.kind, text: target.text, strand: target.strand },
    studentIsAt: target.currentLevel,
    nextLevelMeans: target.nextLevel ? target.nextLevel.description : null,
    // Titles only — enough to steer away from repeating a task, and it carries
    // nothing about how the student did on any of them.
    alreadyCoveredInClass: seen,
  }
}

const SYSTEM = `You write practice questions for one student in a British Columbia school,
aimed at ONE learning standard they are still working on.

You are told the standard, the student's current proficiency level on it, and
what the next level up asks for. Pitch the questions at the step from where they
are to the next level — not at the top of the scale, and not below where they
already are.

THE ANSWER KEY IS THE PART THAT MATTERS. This student is practising alone and
has nothing to check you against, so a confident wrong answer does real damage.
- Only write a question you are certain of. If a topic is one where you might be
  wrong, write an easier question you are sure about instead.
- No trick questions, no ambiguous wording, no "best answer" among defensible
  options. Exactly one option must be correct and the others clearly not.
- The explanation must show the reasoning, not just assert the answer, so a
  student or teacher can see immediately if it is wrong.
- Never reference a specific textbook, page, diagram, dataset or figure — the
  student does not have it in front of them and cannot answer.
- Keep to the grade level given. A Grade 9 question must be answerable with
  Grade 9 knowledge.

Write 3 questions: two multiple choice, one short answer. Vary what they ask for
— recall alone does not move anyone up the proficiency scale.

Hints must nudge, never answer. "Think about what happens to the particles" is a
hint; "the particles spread out" is the answer.

Reply with ONLY a JSON object, no prose, no code fence:
{"questions":[
  {"kind":"mc","prompt":"...","options":["...","...","...","..."],"answerIndex":0,
   "explanation":"why that is right, with the reasoning","hint":"..."},
  {"kind":"short","prompt":"...","lookFor":["point a","point b"],
   "explanation":"what a full answer covers and why","hint":"..."}
]}`

interface RawSet {
  questions?: {
    kind?: string
    prompt?: string
    options?: string[]
    answerIndex?: number
    lookFor?: string[]
    explanation?: string
    hint?: string
  }[]
}

function parseSet(raw: string): RawSet | null {
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try {
    return JSON.parse(stripped.slice(start, end + 1)) as RawSet
  } catch {
    return null
  }
}

export function makeLlmPracticeGenerator(seen: string[]): PracticeGenerator {
  return {
    id: 'anthropic',
    label: 'Generated practice',
    async generate(target: PracticeTarget, plan: PracticePlan): Promise<PracticeSet> {
      const raw = await askModel(SYSTEM, buildPayload(target, plan, seen), {
        maxTokens: 1600,
        label: 'practice',
      })
      const parsed = parseSet(raw)
      if (!parsed?.questions?.length) {
        throw new Error('The practice questions did not come back in a usable form. Try again.')
      }

      const questions: PracticeQuestion[] = parsed.questions
        .map((q, i): PracticeQuestion | null => {
          const prompt = (q.prompt ?? '').trim()
          const explanation = (q.explanation ?? '').trim()
          if (!prompt || !explanation) return null

          if (q.kind === 'mc') {
            const options = (q.options ?? []).map((o) => String(o).trim()).filter(Boolean)
            const answerIndex = q.answerIndex ?? -1
            // A multiple-choice question whose key is out of range would mark a
            // correct answer wrong. Drop it rather than show it.
            if (options.length < 2 || answerIndex < 0 || answerIndex >= options.length) return null
            return {
              id: `q${i}`,
              standardCode: target.code,
              kind: 'mc',
              prompt,
              options,
              answerIndex,
              explanation,
              hint: (q.hint ?? '').trim(),
            }
          }

          return {
            id: `q${i}`,
            standardCode: target.code,
            kind: 'short',
            prompt,
            lookFor: (q.lookFor ?? []).map((l) => String(l).trim()).filter(Boolean),
            explanation,
            hint: (q.hint ?? '').trim(),
          }
        })
        .filter((q): q is PracticeQuestion => q !== null)

      if (questions.length === 0) {
        throw new Error('The practice questions did not come back in a usable form. Try again.')
      }

      return {
        standardCode: target.code,
        questions,
        cautions: [
          'Generated practice, not written by your teacher. It is not marked and does not affect your grade.',
          'If an answer looks wrong to you, it may well be — flag it and your teacher will see it.',
        ],
        generatorId: 'anthropic',
      }
    },
  }
}
