'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { setIdentity } from '../actions'
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

  async function choose(kind: IdentityKind, id: string) {
    setOpen(false)
    await setIdentity(kind, id)
    router.push('/')
    router.refresh()
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
        <Link href="/" className="lms-topbar__link" data-active={pathname === '/'}>
          Courses
        </Link>
        <Link href="/agenda" className="lms-topbar__link" data-active={pathname === '/agenda'}>
          Agenda
        </Link>
        {viewer.kind === 'teacher' && (
          <Link href="/standards" className="lms-topbar__link" data-active={pathname === '/standards'}>
            Standards
          </Link>
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

      <div className="lms-switch" ref={ref}>
        <button type="button" className="lms-switch__btn" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
          <span
            className="lms-avatar"
            style={{ width: 28, height: 28, background: viewer.person.color, fontSize: 12 }}
            aria-hidden
          >
            {initials(viewer.person.name)}
          </span>
          <span className="lms-switch__meta">
            <span className="lms-switch__name">{viewer.person.name}</span>
            <span className="lms-switch__role">Viewing as {viewer.kind}</span>
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
                data-active={viewer.kind === 'teacher' && viewer.person.id === t.id}
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
                data-active={viewer.kind === 'student' && viewer.person.id === s.id}
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
