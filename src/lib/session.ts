// "Who am I" for the sandbox — a cookie-backed role switcher, no real auth.
// The top bar lets you view the whole LMS as any teacher or student; this
// module resolves that choice on the server.

import { cookies } from 'next/headers'
import { getPerson, listTeachers } from './store'
import type { Identity, IdentityKind, Person } from './types'

const COOKIE = 'lms_lab_identity'

export interface Viewer {
  kind: IdentityKind
  person: Person
}

function parse(raw: string | undefined): Identity | null {
  if (!raw) return null
  const [kind, id] = raw.split(':')
  if ((kind !== 'teacher' && kind !== 'student') || !id) return null
  return { kind, id }
}

/** Resolve the current viewer, defaulting to the first teacher. */
export async function getViewer(): Promise<Viewer> {
  const store = await cookies()
  const parsed = parse(store.get(COOKIE)?.value)
  if (parsed) {
    const person = getPerson(parsed.id)
    if (person) return { kind: parsed.kind, person }
  }
  const fallback = listTeachers()[0]
  return { kind: 'teacher', person: fallback }
}

export const IDENTITY_COOKIE = COOKIE
