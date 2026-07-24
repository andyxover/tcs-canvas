'use client'

import { useSyncExternalStore } from 'react'

/** Flips a `data-theme="dark"` attribute on <html> and remembers the choice.
 *  A pre-paint script in the layout applies the saved theme before hydration.
 *  The icon reads the attribute via useSyncExternalStore, so toggling the DOM
 *  attribute (below) re-renders it without any effect/state juggling. */
function subscribe(cb: () => void): () => void {
  const observer = new MutationObserver(cb)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}
function isDark(): boolean {
  return document.documentElement.getAttribute('data-theme') === 'dark'
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false)

  function toggle() {
    const root = document.documentElement
    const next = !isDark()
    if (next) root.setAttribute('data-theme', 'dark')
    else root.removeAttribute('data-theme')
    try {
      localStorage.setItem('tcs-canvas-theme', next ? 'dark' : 'light')
    } catch {
      // ignore storage errors (private mode etc.)
    }
  }

  return (
    <button type="button" className="lms-theme-toggle" onClick={toggle} aria-label="Toggle dark mode" title="Toggle theme">
      {dark ? '☀' : '☾'}
    </button>
  )
}
