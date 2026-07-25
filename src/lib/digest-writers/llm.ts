import type { FamilyDigest } from '../digest'
import { askModel } from '../ai/anthropic'
import { scrubNames } from '../ai/scrub'

/**
 * Writes the digest as prose, in the language the family reads.
 *
 * The structured digest above is already complete and already shown — this does
 * not add facts, it makes them readable to a parent who did not study BC
 * curriculum in English. That ordering matters: if the model fails, the family
 * still sees everything, just in English and as a list.
 *
 * De-identified the same way as everything else. The child's name is put back
 * locally after the response returns, which also means a mistranslated name is
 * impossible.
 */

export interface DigestPayload {
  targetLanguage: string
  gradeReporting: 'proficiency-scale' | 'letter-grade-and-percentage'
  courses: {
    subject: string
    standing?: { letter: string | null; percent: number | null } | null
    canNowDo: { code: string; text: string; level: string; shownIn: string | null }[]
    workingOn: { code: string; text: string; level: string }[]
    notAssessedCount: number
    work: { assigned: number; submitted: number; late: number; missing: number }
    outstanding: string[]
    comingUp: string[]
    teacherFeedback: string[]
  }[]
}

export function buildDigestPayload(
  digest: FamilyDigest,
  targetLanguage: string,
  rosterNames: string[],
): DigestPayload {
  const clean = (t: string) => scrubNames(t, rosterNames)
  const anyStanding = digest.courses.some((c) => c.standing)
  return {
    targetLanguage,
    gradeReporting: anyStanding ? 'letter-grade-and-percentage' : 'proficiency-scale',
    courses: digest.courses.map((c) => ({
      subject: c.courseName,
      standing: c.standing,
      canNowDo: c.canNowDo.map((s) => ({
        code: s.code,
        text: s.text,
        level: s.level,
        shownIn: s.evidencedIn ? clean(s.evidencedIn) : null,
      })),
      workingOn: c.workingOn.map((s) => ({ code: s.code, text: s.text, level: s.level })),
      notAssessedCount: c.notAssessedCount,
      work: c.work,
      outstanding: c.outstanding.map((o) => clean(o.title)),
      comingUp: c.comingUp.map((o) => clean(o.title)),
      teacherFeedback: c.teacherFeedback.map((f) => clean(f.feedback)),
    })),
  }
}

const SYSTEM = `You write a short update for the family of a student at a British Columbia
school in Taiwan. The family reads the target language given; many did not
attend school in English or in the BC system.

You are given, per course: BC learning standards the student has demonstrated
and the work that showed each one, standards still being worked on, counts of
assigned and outstanding work, what is due soon, and any feedback their teacher
wrote. The student is referred to only as "the student".

WHAT THIS IS: a readable version of judgements the teacher has already made.
WHAT IT IS NOT: a new judgement. You do not assess, predict, rank, or
characterise the student's ability, effort, attitude or potential. Nothing in
your output may be a claim the given evidence does not already contain.

Write it like this:
- Lead with what the student can now do, naming the work that showed it. That is
  the part a family cannot get anywhere else.
- Then what is being worked on next, plainly, without softening it into
  meaninglessness and without alarm.
- If work is outstanding, say so directly and name it. A family that finds out
  at report card time was failed by the update, not by the child.
- If standards have not been assessed yet, say that the update cannot speak to
  them. Do not let silence imply everything is accounted for.
- Where a grade or percentage is given, mention it once, near the end. It is the
  least informative thing here. Where none is given the student is reported on
  the proficiency scale — do not invent a percentage or a letter.
- Keep the BC proficiency words (Emerging, Developing, Proficient, Extending) and
  the standard codes, and explain the scale in one short clause the first time
  it appears. Families need the vocabulary the report card will use.
- 150-220 words per course, warm and plain. No greeting, no sign-off, no
  invitation to contact the school — the app handles that.
- For Traditional Chinese use Taiwanese usage and Traditional characters
  throughout, never Simplified.

Reply with ONLY a JSON object, no prose, no code fence:
{"courses":[{"subject":"kept as given","body":"the update in the target language"}]}`

interface RawDigest {
  courses?: { subject?: string; body?: string }[]
}

function parse(raw: string): RawDigest | null {
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start === -1 || end === -1) return null
  try {
    return JSON.parse(stripped.slice(start, end + 1)) as RawDigest
  } catch {
    return null
  }
}

export interface WrittenDigest {
  courses: { subject: string; body: string }[]
  cautions: string[]
}

export async function writeDigest(
  digest: FamilyDigest,
  targetLanguage: string,
  rosterNames: string[],
): Promise<WrittenDigest> {
  const raw = await askModel(SYSTEM, buildDigestPayload(digest, targetLanguage, rosterNames), {
    maxTokens: 2000,
    label: 'family-digest',
  })
  const parsed = parse(raw)
  if (!parsed?.courses?.length) {
    throw new Error('The written update did not come back in a usable form.')
  }
  return {
    courses: parsed.courses
      .map((c) => ({
        subject: (c.subject ?? '').trim(),
        // The name never left, so putting it back is a local substitution on
        // text that never carried it.
        body: (c.body ?? '').replace(/\bthe student\b/gi, digest.student.firstName).trim(),
      }))
      .filter((c) => c.body),
    cautions: [
      'Written by a language model from your child’s recorded work. The details below it are the record itself — if the two seem to disagree, the record is what counts.',
    ],
  }
}
