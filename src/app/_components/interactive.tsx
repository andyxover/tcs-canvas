'use client'

import Link from 'next/link'
import { useLinkStatus } from 'next/link'
import { useState } from 'react'
import { useFormStatus } from 'react-dom'

/**
 * The app's shared interactive primitives, deliberately in ONE module.
 *
 * Chunking reason, not a style preference: these are pulled in by nearly every
 * route. When they lived in separate files, navigating to a page that was
 * previously server-only (announcements, syllabus, modules) made the RSC response
 * reference a brand-new client chunk, costing a second serialized round trip —
 * measured at 150ms latency, that took those hops from ~230ms to ~840ms. The
 * layout's TopBar imports from this module, so it ships in the chunk that loads
 * on first paint and no route pays to fetch it again.
 */

/**
 * The app's default link: prefetch on hover, and acknowledge the click instantly.
 *
 * Why not eager prefetch. Every route here is dynamic, so Next only prefetches a
 * route once it has a loading.tsx — which they now all do. That turns every link
 * in the viewport into a request. Measured on a course page (nine tabs) at 150ms
 * latency, those prefetches saturated the connection pool and pushed
 * time-to-content from ~230ms to ~840ms. And they bought little: prefetching a
 * dynamic route fetches the loading shell, never the content, so the request you
 * actually wait on is unavoidable.
 *
 * Why not just turn prefetch off. Without a warm shell the click sits there with
 * no feedback until the whole page arrives — the thing that made this app feel
 * sluggish in the first place.
 *
 * So: hover starts the prefetch (early enough to cover most clicks, one request
 * instead of nine), and useLinkStatus paints a pending state the moment the click
 * lands — client-side, no network, no waiting. loading.tsx still backs both up
 * when a segment is genuinely slow.
 */
export function HoverLink({
  href,
  className,
  children,
  ...rest
}: {
  href: string
  className?: string
  children: React.ReactNode
} & Omit<React.ComponentProps<typeof Link>, 'href' | 'prefetch' | 'className' | 'children'>) {
  const [armed, setArmed] = useState(false)

  return (
    <Link
      href={href}
      className={className}
      // null means "default behaviour", not "off" — this is the documented idiom.
      prefetch={armed ? null : false}
      onMouseEnter={() => setArmed(true)}
      onFocus={() => setArmed(true)}
      onTouchStart={() => setArmed(true)}
      {...rest}
    >
      {children}
      <PendingDot />
    </Link>
  )
}

/**
 * Must live inside the Link — useLinkStatus reads from it. Always rendered at a
 * fixed size and toggled with opacity so appearing costs no layout shift.
 */
function PendingDot() {
  const { pending } = useLinkStatus()
  return <span className="lms-pending" data-on={pending || undefined} aria-hidden />
}

/**
 * Submit button that reports its own form's pending state.
 *
 * Server actions here go through a full round trip and then a revalidate, so a
 * plain <button type="submit"> leaves the user with no signal that their click
 * registered — the exact complaint that started this work. useFormStatus reads
 * the enclosing form's state, so this needs no props threaded from the page and
 * works inside Server Components.
 *
 * It must be a *descendant* of the form, not the component rendering the form —
 * that's the hook's contract.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className = 'lms-btn lms-btn--primary',
  ...rest
}: {
  children: React.ReactNode
  /** Shown instead of `children` while submitting. Defaults to keeping the label. */
  pendingLabel?: React.ReactNode
  className?: string
} & Omit<React.ComponentProps<'button'>, 'className' | 'children'>) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" className={className} data-pending={pending || undefined} disabled={pending} {...rest}>
      {pending && <span className="lms-spinner" aria-hidden />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  )
}
