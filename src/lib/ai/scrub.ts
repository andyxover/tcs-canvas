/**
 * Name scrubbing, shared by every payload that leaves the building.
 *
 * Free text a human typed — an assignment title, a teacher's feedback, a
 * student's own draft — is the only place a name can hide once the structured
 * fields have been stripped. Both AI features need the same treatment, so it
 * lives in one place rather than being reimplemented per feature.
 *
 * This is data minimisation, not anonymisation in any strong sense: a party
 * holding the course roster could re-identify from the pattern of standards
 * alone. What it guarantees is narrower and still worth having — no name is in
 * the request.
 */

/**
 * Replace every name token with `[student]`.
 *
 * Tokens of two characters or fewer are skipped: initials and short particles
 * ("Le", "Di") collide with ordinary words often enough that scrubbing them
 * mangles the text without protecting anyone.
 */
export function scrubNames(text: string, names: string[]): string {
  let out = text
  for (const n of names) {
    for (const token of n.split(/\s+/).filter((t) => t.length > 2)) {
      out = out.replace(new RegExp(`\\b${escapeRegExp(token)}\\b`, 'gi'), '[student]')
    }
  }
  return out
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
