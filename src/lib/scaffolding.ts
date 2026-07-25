/**
 * Language scaffolding for students learning in an additional language.
 *
 * TCS is a BC school in Taiwan. Most students are demonstrating science, or
 * mathematics, or history, in their second or third language. That is the core
 * population, not an accessibility edge case, and it produces a specific and
 * very common failure: a student who understands the chemistry perfectly well
 * loses marks because they misread what the task asked for. The construct being
 * assessed is chemistry; the thing standing in the way is English. Removing that
 * obstacle is not a favour, it is measuring the right thing.
 *
 * THE LINE THAT MAKES THIS DEFENSIBLE, and the reason it is not simply "add a
 * translate button": translate what is AROUND the assessment, never the
 * assessment itself.
 *
 *   Translatable — task instructions, what the rubric is asking for,
 *     announcements, page content. None of this is what the student is being
 *     marked on; it is the scaffolding around it.
 *   Never — anything where the language IS the construct. An English Studies
 *     reading passage, a vocabulary quiz, a task assessing whether the student
 *     can follow written instructions in English. Translating those does not
 *     remove a barrier, it deletes the measurement.
 *
 * A teacher marks the second case per task, and when they have, the refusal is
 * shown with its reason rather than the button quietly disappearing — a student
 * who cannot see why help is unavailable assumes it is broken.
 *
 * TWO FURTHER RULES, both about not lowering the bar:
 *   1. The translation NEVER replaces the English. It sits alongside it. The
 *      student is examined in English, their teacher writes feedback in English,
 *      and a scaffold that hides the original produces someone who cannot cope
 *      without it.
 *   2. Subject vocabulary stays in English and is GLOSSED, not swapped out.
 *      "Sublimation" has to remain "sublimation" — that is the word on the
 *      provincial exam. Explaining it in the student's language is support;
 *      replacing it is a disservice dressed as one.
 */

import { getAssignment, getCourse, getRubric } from './store'

/**
 * Traditional Chinese first, and deliberately.
 *
 * Taiwan uses Traditional characters. Defaulting an application built for a
 * school in Taipei to Simplified would be the kind of error that tells every
 * family exactly how much thought went into it. Simplified is offered too,
 * because offshore schools do enrol families from the mainland.
 */
export const LANGUAGES = [
  { code: 'zh-TW', label: '繁體中文', english: 'Traditional Chinese' },
  { code: 'zh-CN', label: '简体中文', english: 'Simplified Chinese' },
  { code: 'ko', label: '한국어', english: 'Korean' },
  { code: 'ja', label: '日本語', english: 'Japanese' },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['code']

export function isLanguage(code: string): code is LanguageCode {
  return LANGUAGES.some((l) => l.code === code)
}

export function languageLabel(code: LanguageCode): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code
}

export function languageEnglish(code: LanguageCode): string {
  return LANGUAGES.find((l) => l.code === code)?.english ?? code
}

/** What a task looks like to the scaffolding layer. */
export interface ScaffoldSource {
  /** Course subject, so the glossary knows what register the terms are in. */
  subject: string
  gradeLevel: string
  title: string
  /** Plain text of the instructions — the stored form is teacher HTML. */
  task: string
  /** What each rubric criterion is asking for. Not the marks. */
  rubric: { criterion: string; asks: string }[]
}

export interface GlossaryEntry {
  /** The English term, kept exactly as written. It is what the exam uses. */
  term: string
  /** A short plain-English definition, so the English itself is learnable. */
  english: string
  /** The same idea in the student's language. */
  translated: string
}

export interface Scaffold {
  language: LanguageCode
  /** The instructions in the student's language. Shown beside the English. */
  task: string
  rubric: { criterion: string; asks: string }[]
  glossary: GlossaryEntry[]
  cautions: string[]
  translatorId: string
}

export type ScaffoldRefusal = { refused: true; reason: string }

/**
 * Gather what may be translated for one task, or refuse with a reason.
 *
 * Returns the refusal rather than throwing, because the refusal is a thing the
 * UI must render — silently offering nothing looks like a bug.
 */
export async function gatherScaffoldSource(assignmentId: string): Promise<ScaffoldSource | ScaffoldRefusal> {
  const assignment = await getAssignment(assignmentId)
  if (!assignment) return { refused: true, reason: 'That task could not be found.' }

  if (assignment.languageIsAssessed) {
    return {
      refused: true,
      reason:
        'Your teacher has marked this task as one where the English itself is being assessed, so it is not translated. Translating it would remove the thing you are being asked to show.',
    }
  }
  if (assignment.submissionType === 'quiz') {
    // A quiz's questions ARE the assessment, and the instructions around them
    // are one line of boilerplate. Nothing here is worth translating and the
    // risk of translating a question by accident is not worth running.
    return {
      refused: true,
      reason: 'Quiz questions are the assessment itself, so they are not translated.',
    }
  }

  const course = await getCourse(assignment.courseId)
  if (!course) return { refused: true, reason: 'That course could not be found.' }

  const rubricRow = assignment.rubricId ? await getRubric(assignment.rubricId) : undefined
  return {
    subject: course.curriculum?.subject ?? course.name,
    gradeLevel: course.curriculum?.grade ?? '',
    title: assignment.title,
    task: toPlainText(assignment.instructions),
    // The description of the TOP level only: what a strong piece of work looks
    // like is guidance. The point values are not language and need no help.
    rubric: rubricRow
      ? rubricRow.criteria.map((c) => ({
          criterion: c.name,
          asks: c.levels.reduce((a, b) => (b.points > a.points ? b : a), c.levels[0])?.description ?? '',
        }))
      : [],
  }
}

/** Swap-in point. Translation genuinely needs a model; there is no honest
 *  deterministic fallback, so none is faked. */
export interface Translator {
  id: string
  label: string
  scaffold(source: ScaffoldSource, language: LanguageCode): Promise<Scaffold>
}

function toPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
