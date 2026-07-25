'use server'

import { getViewer } from '@/lib/session'
import { getAssignment, isEnrolled, listRoster, logCoachRequest } from '@/lib/store'
import {
  gatherDraftContext,
  structuredCoach,
  type DraftFeedback,
} from '@/lib/draft-feedback'
import { makeLlmCoach, previewDraftPayload } from '@/lib/feedback-coaches/llm'
import { llmConfigured } from '@/lib/ai/anthropic'

/** Generous enough for any real draft, small enough not to be a payload weapon. */
const MAX_DRAFT_CHARS = 20_000

function liveDraft(fd: FormData): string | undefined {
  const raw = fd.get('draftText')
  if (typeof raw !== 'string') return undefined
  return raw.slice(0, MAX_DRAFT_CHARS)
}

export interface CoachState {
  status: 'idle' | 'ready' | 'error' | 'unconfigured'
  feedback?: DraftFeedback
  /** Exactly what was, or would be, sent. */
  payload?: string
  message?: string
}

/**
 * Who is allowed to ask, and about whose work.
 *
 * A student may only ever coach their own draft in a course they are enrolled
 * in. This is the whole access-control story for the feature, so it is one
 * function rather than a check repeated per action — the version of this bug
 * where a student passes someone else's id and reads their unfinished essay is
 * not one worth risking on copy-paste.
 */
async function authorize(courseId: string, assignmentId: string, studentId: string) {
  const viewer = await getViewer()
  if (viewer.kind !== 'student') return { error: 'Only students can ask for feedback on a draft.' as const }
  if (viewer.person.id !== studentId) return { error: 'You can only ask about your own draft.' as const }
  if (!(await isEnrolled(courseId, studentId))) return { error: 'You are not enrolled in this course.' as const }
  const assignment = await getAssignment(assignmentId)
  if (!assignment || assignment.courseId !== courseId) return { error: 'Assignment not found.' as const }
  if (!assignment.draftCoach) {
    return { error: 'Your teacher has turned off draft feedback for this task.' as const }
  }
  return { assignment }
}

/** The on-device checklist. Never contacts anyone; always available. */
export async function checklistAction(
  courseId: string,
  assignmentId: string,
  studentId: string,
  _prev: CoachState,
  fd: FormData,
): Promise<CoachState> {
  const gate = await authorize(courseId, assignmentId, studentId)
  if ('error' in gate) return { status: 'error', message: gate.error }

  const ctx = await gatherDraftContext(assignmentId, studentId, liveDraft(fd))
  if (!ctx) return { status: 'error', message: 'Could not read this assignment.' }

  await logCoachRequest({ assignmentId, studentId, coachId: 'structured', words: ctx.draft.words })
  return { status: 'ready', feedback: await structuredCoach.coach(ctx) }
}

/** The model coach. On demand only — never during page render. */
export async function coachAction(
  courseId: string,
  assignmentId: string,
  studentId: string,
  _prev: CoachState,
  fd: FormData,
): Promise<CoachState> {
  const gate = await authorize(courseId, assignmentId, studentId)
  if ('error' in gate) return { status: 'error', message: gate.error }

  const ctx = await gatherDraftContext(assignmentId, studentId, liveDraft(fd))
  if (!ctx) return { status: 'error', message: 'Could not read this assignment.' }

  const rosterNames = (await listRoster(courseId)).map((p) => p.name)
  const payload = JSON.stringify(previewDraftPayload(ctx, rosterNames), null, 2)

  if (!llmConfigured()) {
    return {
      status: 'unconfigured',
      payload,
      message:
        'No language model is configured, so nothing was sent anywhere. Below is exactly what would be sent if one were.',
    }
  }

  try {
    const feedback = await makeLlmCoach(rosterNames).coach(ctx)
    await logCoachRequest({ assignmentId, studentId, coachId: 'anthropic', words: ctx.draft.words })
    return { status: 'ready', feedback, payload }
  } catch (err) {
    // The checklist is still there and the draft is untouched.
    return {
      status: 'error',
      payload,
      message: err instanceof Error ? err.message : 'The feedback request failed.',
    }
  }
}

/** Show the payload without contacting anyone. */
export async function inspectDraftPayloadAction(
  courseId: string,
  assignmentId: string,
  studentId: string,
  _prev: CoachState,
  fd: FormData,
): Promise<CoachState> {
  const gate = await authorize(courseId, assignmentId, studentId)
  if ('error' in gate) return { status: 'error', message: gate.error }
  // Same live draft the real request would carry. Previewing the stored (often
  // empty) submission instead would show the student a reassuring payload that
  // isn't the one that gets sent — worse than showing nothing.
  const ctx = await gatherDraftContext(assignmentId, studentId, liveDraft(fd))
  if (!ctx) return { status: 'error', message: 'Could not read this assignment.' }
  const rosterNames = (await listRoster(courseId)).map((p) => p.name)
  return {
    status: 'unconfigured',
    payload: JSON.stringify(previewDraftPayload(ctx, rosterNames), null, 2),
    message: 'Nothing was sent. This is exactly what a feedback request would contain — including your draft.',
  }
}
