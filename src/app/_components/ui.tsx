// Small presentational atoms shared across the sandbox. Server-safe (no client
// hooks) so they can render inside RSC pages.

import type { Person } from '@/lib/types'

export function Avatar({ person, size = 32 }: { person: Person; size?: number }) {
  const initials = person.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  return (
    <span
      className="lms-avatar"
      style={{ width: size, height: size, background: person.color, fontSize: Math.round(size * 0.42) }}
      aria-hidden
    >
      {initials}
    </span>
  )
}

type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'muted'

export function Badge({ tone = 'muted', children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`lms-badge lms-badge--${tone}`}>{children}</span>
}

/**
 * Render trusted, sandbox-authored HTML (syllabus, instructions, announcements).
 * Trust boundary: in the sandbox this HTML comes only from the seed and from
 * teacher forms in a no-real-users demo — never from untrusted input. When the
 * sandbox graduates, this must be swapped for a sanitizing renderer (DOMPurify)
 * before real users can author content.
 */
export function RichText({ html }: { html: string }) {
  return <div className="lms-prose" dangerouslySetInnerHTML={{ __html: html }} />
}

export function EmptyState({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="lms-empty">
      <div className="lms-empty__icon" aria-hidden>
        {icon}
      </div>
      <div style={{ fontWeight: 600, color: 'var(--lms-ink)' }}>{title}</div>
      {hint && <div style={{ fontSize: 13 }}>{hint}</div>}
    </div>
  )
}

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Taipei',
})

const DAY_FMT = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'Asia/Taipei',
})

export function fmtDateTime(iso: string | null): string {
  if (!iso) return 'No date'
  return DATE_FMT.format(new Date(iso))
}

export function fmtDay(iso: string | null): string {
  if (!iso) return 'No due date'
  return DAY_FMT.format(new Date(iso))
}

/** Human "in 3 days" / "2 days ago" relative to now. */
export function fmtRelative(iso: string | null): string {
  if (!iso) return ''
  const diff = new Date(iso).getTime() - Date.now()
  const days = Math.round(diff / (24 * 60 * 60 * 1000))
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (days > 0) return `in ${days} days`
  return `${Math.abs(days)} days ago`
}
