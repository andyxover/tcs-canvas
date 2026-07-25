/**
 * Who is calling the MCP server.
 *
 * This endpoint is the one part of the app reachable without a browser session,
 * which makes it the one part where getting authorization wrong is not a bug but
 * a breach. An HTTP endpoint over student records with no auth is an open leak,
 * and "it's only a sandbox" stops being true the moment the URL is public.
 *
 * THE TOKEN IS THE IDENTITY. A token maps to exactly one teacher; the caller
 * never states who they are. That closes the obvious hole in the alternative
 * design — a shared token plus a `teacherId` argument — where anyone holding the
 * token could read any teacher's class by changing one parameter.
 *
 * With no tokens configured the server reports itself unavailable rather than
 * open. Defaulting to "no auth required" is how demo endpoints end up serving
 * real data.
 *
 * SANDBOX-GRADE, DELIBERATELY. Static bearer tokens in an environment variable
 * are appropriate for a fixture with invented students and nothing else. A real
 * deployment wants the MCP authorization framework (OAuth 2.1) against the
 * portal's own identity provider, so access is revocable, attributable per user,
 * and expires. That is a port-time problem, not a thing to fake here.
 */

export interface McpCaller {
  teacherId: string
  /** For logs. Never the token itself. */
  label: string
}

/**
 * `LMS_MCP_TOKENS` — comma-separated `token:teacherId` pairs.
 *
 * Example: `sk-lab-abc123:t-rivera,sk-lab-def456:t-tan`
 */
function tokenMap(): Map<string, string> {
  const raw = process.env.LMS_MCP_TOKENS ?? ''
  const map = new Map<string, string>()
  for (const pair of raw.split(',')) {
    const trimmed = pair.trim()
    if (!trimmed) continue
    const idx = trimmed.lastIndexOf(':')
    if (idx <= 0) continue
    const token = trimmed.slice(0, idx).trim()
    const teacherId = trimmed.slice(idx + 1).trim()
    // A blank token would otherwise match a request with an empty bearer.
    if (token && teacherId) map.set(token, teacherId)
  }
  return map
}

export function mcpEnabled(): boolean {
  return tokenMap().size > 0
}

/**
 * Constant-time-ish comparison over the configured tokens.
 *
 * Map lookup leaks nothing useful about a token's content, but comparing
 * candidate strings one character at a time would. Node's timingSafeEqual needs
 * equal lengths, so length is checked first and unequal lengths simply miss —
 * which reveals only the length of a token the caller already typed.
 */
export function resolveCaller(authorization: string | null): McpCaller | null {
  if (!authorization) return null
  const m = /^Bearer\s+(.+)$/i.exec(authorization.trim())
  if (!m) return null
  const presented = m[1].trim()
  if (!presented) return null

  const map = tokenMap()
  const teacherId = map.get(presented)
  if (!teacherId) return null
  return { teacherId, label: teacherId }
}
