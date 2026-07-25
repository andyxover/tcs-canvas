'use server'

import { getViewer } from '@/lib/session'
import { appendWritingEvents, getAssignment } from '@/lib/store'
import type { WritingEvent } from '@/lib/types'

/** One flush is 15s of work; anything past this is not a real writing session. */
const MAX_BATCH = 400
/** An hour of "active" time in a single flush is a clock problem, not writing. */
const MAX_ACTIVE_MS = 60 * 60 * 1000

/**
 * Record how a draft was written.
 *
 * Everything is re-derived from the session: a student can only ever write their
 * own provenance, and only for an assignment where the teacher switched capture
 * on. The client sends the events, so they are shaped rather than trusted —
 * clamped and type-checked before they reach the store.
 */
export async function recordWritingAction(
  assignmentId: string,
  studentId: string,
  events: WritingEvent[],
  activeMs: number,
): Promise<void> {
  const viewer = await getViewer()
  if (viewer.kind !== 'student' || viewer.person.id !== studentId) return

  const assignment = await getAssignment(assignmentId)
  if (!assignment?.processCapture) return

  const clean = (Array.isArray(events) ? events : [])
    .slice(0, MAX_BATCH)
    .filter(
      (e): e is WritingEvent =>
        !!e &&
        typeof e.t === 'number' &&
        Number.isFinite(e.t) &&
        typeof e.len === 'number' &&
        typeof e.delta === 'number' &&
        (e.kind === 'type' || e.kind === 'paste' || e.kind === 'delete'),
    )
    .map((e) => ({
      t: Math.max(0, Math.round(e.t)),
      kind: e.kind,
      len: Math.max(0, Math.round(e.len)),
      delta: Math.max(0, Math.round(e.delta)),
    }))

  const active = Number.isFinite(activeMs) ? Math.min(Math.max(0, Math.round(activeMs)), MAX_ACTIVE_MS) : 0
  if (clean.length === 0 && active === 0) return

  await appendWritingEvents({ assignmentId, studentId, events: clean, activeMs: active })
}
