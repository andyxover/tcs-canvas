'use server'

// Server actions for the sandbox. These mutate the in-memory store and set the
// identity cookie. No auth checks — this is a demo playground by design.

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { IDENTITY_COOKIE } from '@/lib/session'
import type { IdentityKind } from '@/lib/types'

export async function setIdentity(kind: IdentityKind, id: string): Promise<void> {
  const store = await cookies()
  store.set(IDENTITY_COOKIE, `${kind}:${id}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  revalidatePath('/', 'layout')
}
