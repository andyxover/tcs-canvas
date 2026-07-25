'use server'

import { getViewer } from '@/lib/session'
import { getCourse, listRoster } from '@/lib/store'
import { gatherEvidence } from '@/lib/report-comments'
import { llmConfigured, makeLlmDrafter, previewPayload } from '@/lib/comment-drafters/llm'

export interface AiDraftState {
  status: 'idle' | 'ready' | 'error' | 'unconfigured'
  body?: string
  cautions?: string[]
  /** Exactly what was (or would be) sent. */
  payload?: string
  message?: string
}

/**
 * Drafted on demand, one student at a time — deliberately not during page render.
 * Rendering the roster would otherwise fire a model call per student on every
 * page view, which is slow, costs money for nothing, and sends far more evidence
 * out of the building than anyone asked for.
 */
export async function aiDraftAction(
  courseId: string,
  studentId: string,
  _prev: AiDraftState,
  _fd: FormData,
): Promise<AiDraftState> {
  const viewer = await getViewer()
  if (viewer.kind !== 'teacher') return { status: 'error', message: 'Teachers only.' }

  const course = await getCourse(courseId)
  if (!course) return { status: 'error', message: 'Course not found.' }

  const evidence = await gatherEvidence(courseId, studentId)
  if (!evidence) return { status: 'error', message: 'No evidence for this student.' }

  const rosterNames = (await listRoster(courseId)).map((p) => p.name)
  const payload = JSON.stringify(previewPayload(evidence, rosterNames), null, 2)

  if (!llmConfigured()) {
    return {
      status: 'unconfigured',
      payload,
      message:
        'No ANTHROPIC_API_KEY is set, so nothing was sent anywhere. The payload below is exactly what would be sent if one were configured.',
    }
  }

  try {
    const draft = await makeLlmDrafter(rosterNames).draft(evidence)
    return { status: 'ready', body: draft.body, cautions: draft.cautions, payload }
  } catch (err) {
    // A drafting failure must never take the page with it — the structured
    // draft is still sitting in the editor, untouched.
    return {
      status: 'error',
      payload,
      message: err instanceof Error ? err.message : 'The drafting request failed.',
      // The structured draft is untouched in the editor either way.
    }
  }
}

/** Show the payload without contacting anyone. */
export async function inspectPayloadAction(
  courseId: string,
  studentId: string,
  _prev: AiDraftState,
  _fd: FormData,
): Promise<AiDraftState> {
  const viewer = await getViewer()
  if (viewer.kind !== 'teacher') return { status: 'error', message: 'Teachers only.' }
  const evidence = await gatherEvidence(courseId, studentId)
  if (!evidence) return { status: 'error', message: 'No evidence for this student.' }
  const rosterNames = (await listRoster(courseId)).map((p) => p.name)
  return {
    status: 'unconfigured',
    payload: JSON.stringify(previewPayload(evidence, rosterNames), null, 2),
    message: 'Nothing was sent. This is exactly what a drafting request would contain.',
  }
}
