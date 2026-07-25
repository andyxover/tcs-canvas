import type { LanguageCode, Scaffold, ScaffoldSource, Translator } from '../scaffolding'
import { languageEnglish } from '../scaffolding'
import { askModel } from '../ai/anthropic'

/**
 * Model-backed translation and glossary.
 *
 * The payload is the least sensitive of any AI feature here: a task the teacher
 * wrote, for the whole class, containing no student's name or work. It still
 * goes through inspect-before-send, because an affordance that appears only when
 * we judge it necessary teaches nobody to trust it.
 *
 * Most of the prompt is spent stopping the model from being helpful in the wrong
 * direction — answering the task, simplifying the science, or replacing English
 * technical vocabulary the student is going to be examined on.
 */

export interface ScaffoldPayload {
  targetLanguage: string
  subject: string
  gradeLevel: string
  title: string
  task: string
  rubric: { criterion: string; asks: string }[]
}

export function buildScaffoldPayload(source: ScaffoldSource, language: LanguageCode): ScaffoldPayload {
  return {
    targetLanguage: languageEnglish(language),
    subject: source.subject,
    gradeLevel: source.gradeLevel,
    title: source.title,
    task: source.task,
    rubric: source.rubric,
  }
}

const SYSTEM = `You help a student at a British Columbia school in Taiwan understand what a
task is asking. Most students here are working in their second or third
language, and are being assessed on the subject — not on their English.

You are given a task written by their teacher, and a target language.

WHAT YOU ARE DOING: making the instructions understandable.
WHAT YOU ARE NOT DOING: the task, or any part of it.

Rules, in order of importance:

1. NEVER ANSWER THE TASK. Do not supply the hypothesis, the calculation, the
   conclusion, the method, or an example answer — not even partially, not even
   as illustration. You are translating a question, not responding to it.

2. DO NOT SIMPLIFY THE SUBJECT. Translate what the teacher asked for at the
   level they asked it. If the task requires plotting a heating curve and
   identifying phase transitions, the translation requires exactly that. Making
   the science easier is not translation and it lowers what this student is
   expected to achieve.

3. KEEP SUBJECT VOCABULARY IN ENGLISH. Technical terms — "sublimation",
   "independent variable", "conservation of energy" — stay in English inside the
   translated text, because those are the words on the provincial exam and in
   their teacher's feedback. Where a term needs explaining, put it in the
   glossary rather than replacing it in the text.

4. Translate into the target language as actually written by people who use it.
   For Traditional Chinese use Taiwanese usage and Traditional characters
   throughout — never Simplified.

5. The glossary holds the subject terms in this task that a student new to the
   language would stumble on. For each: the English term exactly as it appears,
   a short plain-English definition (so the English is learnable, not just
   bypassed), and the same idea in the target language. Between 3 and 8 entries.
   Ordinary words do not belong here — only terms carrying subject meaning.

Reply with ONLY a JSON object, no prose, no code fence:
{"task":"the instructions in the target language",
 "rubric":[{"criterion":"kept in English","asks":"translated"}],
 "glossary":[{"term":"English term","english":"short definition","translated":"..."}]}`

interface RawScaffold {
  task?: string
  rubric?: { criterion?: string; asks?: string }[]
  glossary?: { term?: string; english?: string; translated?: string }[]
}

function parse(raw: string): RawScaffold | null {
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try {
    return JSON.parse(stripped.slice(start, end + 1)) as RawScaffold
  } catch {
    return null
  }
}

export function makeLlmTranslator(): Translator {
  return {
    id: 'anthropic',
    label: 'Translation',
    async scaffold(source: ScaffoldSource, language: LanguageCode): Promise<Scaffold> {
      const raw = await askModel(SYSTEM, buildScaffoldPayload(source, language), {
        maxTokens: 2000,
        label: 'scaffolding',
      })
      const parsed = parse(raw)
      if (!parsed?.task?.trim()) {
        throw new Error('The translation did not come back in a usable form. Try again.')
      }

      return {
        language,
        task: parsed.task.trim(),
        rubric: (parsed.rubric ?? [])
          .map((r) => ({ criterion: (r.criterion ?? '').trim(), asks: (r.asks ?? '').trim() }))
          .filter((r) => r.criterion && r.asks),
        glossary: (parsed.glossary ?? [])
          .map((g) => ({
            term: (g.term ?? '').trim(),
            english: (g.english ?? '').trim(),
            translated: (g.translated ?? '').trim(),
          }))
          // A glossary entry missing its English term would defeat the point —
          // the whole design is that the English survives.
          .filter((g) => g.term && (g.english || g.translated)),
        cautions: [
          'A machine translation of your teacher’s instructions. The English above is what counts — if the two seem to disagree, ask your teacher.',
        ],
        translatorId: 'anthropic',
      }
    },
  }
}
