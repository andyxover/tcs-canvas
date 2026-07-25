'use server'

import { cookies } from 'next/headers'
import { getViewer } from '@/lib/session'
import { getAssignment } from '@/lib/store'
import {
  gatherScaffoldSource,
  isLanguage,
  type LanguageCode,
  type Scaffold,
} from '@/lib/scaffolding'
import { buildScaffoldPayload, makeLlmTranslator } from '@/lib/translators/llm'
import { llmConfigured } from '@/lib/ai/anthropic'

// Not exported: a 'use server' module may only export async functions, and
// nothing outside this file needs the cookie name.
const LANG_COOKIE = 'lms_lab_language'

export interface ScaffoldState {
  status: 'idle' | 'ready' | 'refused' | 'error' | 'unconfigured'
  scaffold?: Scaffold
  payload?: string
  message?: string
}

/**
 * Remember the language.
 *
 * A student who needs this needs it on every task, and making them pick again on
 * each page is the kind of friction that ends in nobody using it.
 */
export async function setLanguageAction(code: string): Promise<void> {
  if (!isLanguage(code) && code !== '') return
  const jar = await cookies()
  if (code === '') jar.delete(LANG_COOKIE)
  else jar.set(LANG_COOKIE, code, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
}

export async function readLanguage(): Promise<LanguageCode | null> {
  const raw = (await cookies()).get(LANG_COOKIE)?.value
  return raw && isLanguage(raw) ? raw : null
}

export async function scaffoldAction(
  courseId: string,
  assignmentId: string,
  language: string,
  _prev: ScaffoldState,
  _fd: FormData,
): Promise<ScaffoldState> {
  const viewer = await getViewer()
  if (!viewer.person) return { status: 'error', message: 'Not signed in.' }
  if (!isLanguage(language)) return { status: 'error', message: 'Unknown language.' }

  const assignment = await getAssignment(assignmentId)
  if (!assignment || assignment.courseId !== courseId) {
    return { status: 'error', message: 'That task could not be found.' }
  }

  const source = await gatherScaffoldSource(assignmentId)
  // The refusal is a first-class result, not an error — the student is told why.
  if ('refused' in source) return { status: 'refused', message: source.reason }

  const payload = JSON.stringify(buildScaffoldPayload(source, language), null, 2)

  if (!llmConfigured()) {
    return {
      status: 'unconfigured',
      payload,
      message:
        'No translation is configured, so nothing was sent anywhere. Below is exactly what would be sent if one were.',
    }
  }

  try {
    return { status: 'ready', scaffold: await makeLlmTranslator().scaffold(source, language), payload }
  } catch (err) {
    return {
      status: 'error',
      payload,
      message: err instanceof Error ? err.message : 'The translation failed.',
    }
  }
}

/** Show the payload without contacting anyone. */
export async function inspectScaffoldPayloadAction(
  courseId: string,
  assignmentId: string,
  language: string,
  _prev: ScaffoldState,
  _fd: FormData,
): Promise<ScaffoldState> {
  const viewer = await getViewer()
  if (!viewer.person) return { status: 'error', message: 'Not signed in.' }
  if (!isLanguage(language)) return { status: 'error', message: 'Unknown language.' }
  const source = await gatherScaffoldSource(assignmentId)
  if ('refused' in source) return { status: 'refused', message: source.reason }
  return {
    status: 'unconfigured',
    payload: JSON.stringify(buildScaffoldPayload(source, language), null, 2),
    message: 'Nothing was sent. This is exactly what a translation request would contain.',
  }
}
