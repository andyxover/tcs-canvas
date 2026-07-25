'use server'

import { getViewer } from '@/lib/session'
import { listCoursesForStudent, listRoster, wardOf } from '@/lib/store'
import { gatherFamilyDigest } from '@/lib/digest'
import { buildDigestPayload, writeDigest, type WrittenDigest } from '@/lib/digest-writers/llm'
import { llmConfigured } from '@/lib/ai/anthropic'

export interface DigestState {
  status: 'idle' | 'ready' | 'error' | 'unconfigured'
  written?: WrittenDigest
  payload?: string
  message?: string
}

/**
 * The only door to a child's record for anyone who is not staff.
 *
 * Everything guardian-facing resolves through here. The identity comes from the
 * session and the link from `wardOf` — a studentId arriving from the client is
 * checked against the guardianship, never trusted. Hiding another family's child
 * in the UI is not access control; this is.
 */
async function authorizeGuardian(studentId: string) {
  const viewer = await getViewer()
  if (viewer.kind !== 'guardian') return { error: 'Not a guardian account.' as const }
  const link = await wardOf(viewer.person.id, studentId)
  if (!link) return { error: 'You do not have access to that student.' as const }
  return { guardian: viewer.person, link }
}

export async function writeDigestAction(
  studentId: string,
  _prev: DigestState,
  _fd: FormData,
): Promise<DigestState> {
  const gate = await authorizeGuardian(studentId)
  if ('error' in gate) return { status: 'error', message: gate.error }

  const courses = await listCoursesForStudent(studentId)
  const digest = await gatherFamilyDigest(
    studentId,
    { name: gate.guardian.name, relation: gate.link.relation, language: gate.link.language },
    courses.map((c) => c.id),
  )
  if (!digest) return { status: 'error', message: 'Could not read that student.' }

  // Names from every course this child is in, so a classmate mentioned in
  // teacher feedback is scrubbed too — not just the child's own name.
  const rosterNames = new Set<string>()
  for (const c of courses) for (const p of await listRoster(c.id)) rosterNames.add(p.name)

  const payload = JSON.stringify(
    buildDigestPayload(digest, gate.link.language, [...rosterNames]),
    null,
    2,
  )

  if (!llmConfigured()) {
    return {
      status: 'unconfigured',
      payload,
      message:
        'No language model is configured, so nothing was sent anywhere. The full record is below in English, and below that is exactly what would be sent.',
    }
  }

  try {
    return { status: 'ready', written: await writeDigest(digest, gate.link.language, [...rosterNames]), payload }
  } catch (err) {
    // The structured digest is on the page regardless — a failure here costs
    // the family readability, never information.
    return {
      status: 'error',
      payload,
      message: err instanceof Error ? err.message : 'Could not write the update.',
    }
  }
}

/** Show the payload without contacting anyone. */
export async function inspectDigestPayloadAction(
  studentId: string,
  _prev: DigestState,
  _fd: FormData,
): Promise<DigestState> {
  const gate = await authorizeGuardian(studentId)
  if ('error' in gate) return { status: 'error', message: gate.error }
  const courses = await listCoursesForStudent(studentId)
  const digest = await gatherFamilyDigest(
    studentId,
    { name: gate.guardian.name, relation: gate.link.relation, language: gate.link.language },
    courses.map((c) => c.id),
  )
  if (!digest) return { status: 'error', message: 'Could not read that student.' }
  const rosterNames = new Set<string>()
  for (const c of courses) for (const p of await listRoster(c.id)) rosterNames.add(p.name)
  return {
    status: 'unconfigured',
    payload: JSON.stringify(buildDigestPayload(digest, gate.link.language, [...rosterNames]), null, 2),
    message: 'Nothing was sent. This is exactly what a request would contain.',
  }
}
