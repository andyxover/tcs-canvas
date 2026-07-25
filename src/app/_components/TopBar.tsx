'use client'

import { useState, useRef, useEffect, useOptimistic, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { setIdentity } from '../actions'
import { HoverLink } from './interactive'
import { ThemeToggle } from './ThemeToggle'
import type { IdentityKind, Person } from '@/lib/types'

type Props = {
  viewer: { kind: IdentityKind; person: Person }
  teachers: Person[]
  students: Person[]
}

export function TopBar({ viewer, teachers, students }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()
  const pathname = usePathname()
  const ref = useRef<HTMLDivElement>(null)
  const [switching, startSwitching] = useTransition()
  const [shownViewer, setPendingViewer] = useOptimistic(viewer)

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  /**
   * Switching who you're viewing as is three sequential round trips — write the
   * cookie, navigate, revalidate — and it used to sit there looking broken for
   * all of them. The optimistic viewer swaps the name and avatar in the same
   * frame as the click; if the action fails React reverts it for us.
   */
  function choose(kind: IdentityKind, id: string) {
    const next = (kind === 'teacher' ? teachers : students).find((p) => p.id === id)
    if (!next) return
    setOpen(false)
    startSwitching(async () => {
      setPendingViewer({ kind, person: next })
      await setIdentity(kind, id)
      router.push('/')
      router.refresh()
    })
  }

  return (
    <header className="lms-topbar">
      <Link href="/" className="lms-topbar__brand">
        <span className="lms-topbar__mark" aria-hidden>
          ◧
        </span>
        <span>TCS Learn</span>
      </Link>
      <span className="lms-topbar__lab">Sandbox</span>
      <nav className="lms-topbar__nav">
        <HoverLink href="/" className="lms-topbar__link" data-active={pathname === '/'}>
          Courses
        </HoverLink>
        <HoverLink href="/agenda" className="lms-topbar__link" data-active={pathname === '/agenda'}>
          Agenda
        </HoverLink>
        {shownViewer.kind === 'teacher' && (
          <HoverLink href="/standards" className="lms-topbar__link" data-active={pathname === '/standards'}>
            Standards
          </HoverLink>
        )}
      </nav>
      <div className="lms-topbar__spacer" />

      <form className="lms-topbar__search" onSubmit={onSearch} role="search">
        <span aria-hidden>🔍</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          aria-label="Search courses, assignments, people"
        />
      </form>

      <ThemeToggle />

      <div className="lms-switch" ref={ref} data-busy={switching || undefined}>
        <button type="button" className="lms-switch__btn" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
          <span
            className="lms-avatar"
            style={{ width: 28, height: 28, background: shownViewer.person.color, fontSize: 12 }}
            aria-hidden
          >
            {initials(shownViewer.person.name)}
          </span>
          <span className="lms-switch__meta">
            <span className="lms-switch__name">{shownViewer.person.name}</span>
            <span className="lms-switch__role">Viewing as {shownViewer.kind}</span>
          </span>
          <span aria-hidden style={{ color: '#9fb0d6' }}>
            ▾
          </span>
        </button>

        {open && (
          <div className="lms-switch__menu" role="menu">
            <div className="lms-switch__group">Teachers</div>
            {teachers.map((t) => (
              <button
                key={t.id}
                type="button"
                className="lms-switch__item"
                data-active={shownViewer.kind === 'teacher' && shownViewer.person.id === t.id}
                onClick={() => choose('teacher', t.id)}
              >
                <span className="lms-avatar" style={{ width: 26, height: 26, background: t.color, fontSize: 11 }} aria-hidden>
                  {initials(t.name)}
                </span>
                {t.name}
              </button>
            ))}
            <div className="lms-switch__group">Students</div>
            {students.map((s) => (
              <button
                key={s.id}
                type="button"
                className="lms-switch__item"
                data-active={shownViewer.kind === 'student' && shownViewer.person.id === s.id}
                onClick={() => choose('student', s.id)}
              >
                <span className="lms-avatar" style={{ width: 26, height: 26, background: s.color, fontSize: 11 }} aria-hidden>
                  {initials(s.name)}
                </span>
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
}
