/**
 * The one place this app talks to a language model.
 *
 * Both AI features (report-card comment drafting and formative feedback on a
 * draft) route through here, so the key handling, the timeout, and — most
 * importantly — the error-mapping table exist once. When a second feature
 * copies its own fetch call, the copy is where the raw provider JSON leaks back
 * into a teacher's face.
 *
 * Nothing here knows what it is being asked. Callers own the system prompt and
 * the payload; this module owns the transport and the failure modes.
 */

/** Carries a message already written for a person to read, not a stack trace. */
export class DraftError extends Error {}

const API = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-5'
const TIMEOUT_MS = 25_000

export function llmConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export function llmModel(): string {
  return process.env.ANTHROPIC_COMMENT_MODEL || DEFAULT_MODEL
}

/** Provider status → a sentence the reader can act on. */
export function humanError(status: number): string {
  if (status === 401 || status === 403)
    return 'The configured API key was rejected. Check ANTHROPIC_API_KEY in the environment settings.'
  if (status === 429) return 'The provider is rate limiting requests right now. Try again in a moment.'
  if (status === 400) return 'The provider rejected the request. This is a bug on our side, not yours.'
  if (status >= 500) return 'The provider is having trouble. Try again shortly.'
  return `The request failed (status ${status}).`
}

/**
 * Ask the model, and return its text.
 *
 * `payload` is serialized as the user turn — every caller sends structured
 * evidence rather than prose, which is what makes the request inspectable
 * before it is sent.
 */
export async function askModel(
  system: string,
  payload: unknown,
  opts: { maxTokens?: number; label?: string } = {},
): Promise<string> {
  const { maxTokens = 400, label = 'ai' } = opts
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(API, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY as string,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: llmModel(),
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: JSON.stringify(payload, null, 2) }],
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      // Full detail to the server log for whoever is debugging; the person at
      // the screen gets a sentence. Showing them raw provider JSON is noise at
      // best and leaks request identifiers at worst.
      console.error(`[${label}] Anthropic API ${res.status}: ${detail.slice(0, 500)}`)
      throw new DraftError(humanError(res.status))
    }
    const json = (await res.json()) as { content?: { type: string; text?: string }[] }
    const text = (json.content ?? [])
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('')
      .trim()
    if (!text) throw new DraftError('The provider returned an empty response. Try again.')
    return text
  } catch (err) {
    if (err instanceof DraftError) throw err
    if (err instanceof Error && err.name === 'AbortError') {
      throw new DraftError('The request took too long and was stopped.')
    }
    console.error(`[${label}] request failed:`, err)
    throw new DraftError('Could not reach the language model provider.')
  } finally {
    clearTimeout(timer)
  }
}
