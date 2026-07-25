'use server'

import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/session'
import { flagPracticeQuestion, isEnrolled, resolvePracticeFlag } from '@/lib/store'
import { gatherPracticePlan, seenPrompts, type PracticeSet } from '@/lib/practice'
import { buildPayload, makeLlmPracticeGenerator } from '@/lib/practice-generators/llm'
import { llmConfigured } from '@/lib/ai/anthropic'

export interface PracticeState {
  status: 'idle' | 'ready' | 'error' | 'unconfigured'
  set?: PracticeSet
  payload?: string
  message?: string
  standardCode?: string
}

/** A student may only generate practice for themselves, in their own course. */
async function authorize(courseId: string) {
  const viewer = await getViewer()
  if (viewer.kind !== 'student') return { error: 'Practice is for students.' as const }
  if (!(await isEnrolled(courseId, viewer.person.id))) {
    return { error: 'You are not enrolled in this course.' as const }
  }
  return { studentId: viewer.person.id }
}

export async function generatePracticeAction(
  courseId: string,
  standardId: string,
  _prev: PracticeState,
  _fd: FormData,
): Promise<PracticeState> {
  const gate = await authorize(courseId)
  if ('error' in gate) return { status: 'error', message: gate.error }

  const plan = await gatherPracticePlan(courseId, gate.studentId)
  const target = plan?.targets.find((t) => t.standardId === standardId)
  if (!plan || !target) return { status: 'error', message: 'That standard is not on your plan.' }

  const seen = await seenPrompts(courseId, gate.studentId)
  const payload = JSON.stringify(buildPayload(target, plan, seen), null, 2)

  if (!llmConfigured()) {
    return {
      status: 'unconfigured',
      payload,
      standardCode: target.code,
      message:
        'No language model is configured, so no questions were generated and nothing was sent. Your study plan above works without one.',
    }
  }

  try {
    const set = await makeLlmPracticeGenerator(seen).generate(target, plan)
    return { status: 'ready', set, payload, standardCode: target.code }
  } catch (err) {
    return {
      status: 'error',
      payload,
      standardCode: target.code,
      message: err instanceof Error ? err.message : 'Could not generate practice.',
    }
  }
}

/** Show the payload without contacting anyone. */
export async function inspectPracticePayloadAction(
  courseId: string,
  standardId: string,
  _prev: PracticeState,
  _fd: FormData,
): Promise<PracticeState> {
  const gate = await authorize(courseId)
  if ('error' in gate) return { status: 'error', message: gate.error }
  const plan = await gatherPracticePlan(courseId, gate.studentId)
  const target = plan?.targets.find((t) => t.standardId === standardId)
  if (!plan || !target) return { status: 'error', message: 'That standard is not on your plan.' }
  const seen = await seenPrompts(courseId, gate.studentId)
  return {
    status: 'unconfigured',
    standardCode: target.code,
    payload: JSON.stringify(buildPayload(target, plan, seen), null, 2),
    message: 'Nothing was sent. This is exactly what a request would contain.',
  }
}

/**
 * "This looks wrong."
 *
 * Deliberately one click and a free-text box: a student who suspects the answer
 * key is wrong is usually not confident enough to argue it, and any friction
 * here loses the report entirely — which is the one signal that catches a bad
 * question before the rest of the class works through it.
 */
export async function flagPracticeAction(courseId: string, fd: FormData): Promise<void> {
  const gate = await authorize(courseId)
  if ('error' in gate) return

  const prompt = String(fd.get('prompt') ?? '').slice(0, 2000)
  if (!prompt.trim()) return

  await flagPracticeQuestion({
    courseId,
    studentId: gate.studentId,
    standardCode: String(fd.get('standardCode') ?? '').slice(0, 40),
    prompt,
    given: String(fd.get('given') ?? '').slice(0, 4000),
    note: String(fd.get('note') ?? '').slice(0, 1000),
  })
  revalidatePath(`/lms/courses/${courseId}/practice`, 'page')
}

/** Teachers clear a flag once they have looked at it. */
export async function resolveFlagAction(courseId: string, flagId: string): Promise<void> {
  const viewer = await getViewer()
  if (viewer.kind !== 'teacher') return
  await resolvePracticeFlag(flagId)
  revalidatePath(`/lms/courses/${courseId}/standards`, 'page')
}
