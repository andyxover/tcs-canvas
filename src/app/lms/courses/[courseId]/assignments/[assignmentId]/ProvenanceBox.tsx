'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { WritingEvent } from '@/lib/types'
import { recordWritingAction } from './provenance-actions'

/**
 * The response box, with a record of how it got filled in.
 *
 * WHAT IS RECORDED: document length over time, the size of each paste, and how
 * long the editor was actually focused. That is the whole list.
 *
 * WHAT IS NOT: the text. Not keystrokes, not snapshots, not deleted content.
 * A teacher's real question is "was this composed or did it arrive in blocks",
 * and length-over-time answers it without the school holding a replay of a
 * fifteen-year-old's unfinished sentences.
 *
 * The student is told this is on before they type — see the notice rendered
 * above this component. Recording how someone works without telling them is
 * indefensible, and doing it to minors doubly so.
 */

/** Typing is coalesced into buckets so a 1,000-word essay is ~100 events. */
const BUCKET_MS = 3_000
/** How often buffered events are handed to the server. */
const FLUSH_MS = 15_000
/** Below this a "paste" is more likely a fixed typo than a block of text. */
const PASTE_FLOOR = 20

export function ProvenanceBox({
  assignmentId,
  studentId,
  defaultValue,
  enabled,
}: {
  assignmentId: string
  studentId: string
  defaultValue: string
  enabled: boolean
}) {
  const [len, setLen] = useState(defaultValue.length)

  const started = useRef<number>(0)
  const buffer = useRef<WritingEvent[]>([])
  const bucket = useRef<{ start: number; added: number; removed: number } | null>(null)
  const lastLen = useRef(defaultValue.length)
  const pasting = useRef(0)
  const focusedAt = useRef<number | null>(null)
  const activeMs = useRef(0)

  const now = () => {
    if (started.current === 0) started.current = Date.now()
    return Date.now() - started.current
  }

  const closeBucket = useCallback(() => {
    const b = bucket.current
    if (!b) return
    // Net direction only: a bucket where more went in than came out is typing,
    // the reverse is revision. Recording both from one bucket would double-count
    // the same three seconds.
    if (b.added > b.removed) {
      buffer.current.push({ t: b.start, kind: 'type', len: lastLen.current, delta: b.added - b.removed })
    } else if (b.removed > b.added) {
      buffer.current.push({ t: b.start, kind: 'delete', len: lastLen.current, delta: b.removed - b.added })
    }
    bucket.current = null
  }, [])

  const flush = useCallback(async () => {
    closeBucket()
    // Bank the time so far without ending the session — a student who writes for
    // twenty minutes straight should not have that time appear only on blur.
    let elapsed = 0
    if (focusedAt.current !== null) {
      elapsed = Date.now() - focusedAt.current
      focusedAt.current = Date.now()
    }
    const pending = activeMs.current + elapsed
    if (buffer.current.length === 0 && pending === 0) return
    const events = buffer.current
    buffer.current = []
    activeMs.current = 0
    try {
      await recordWritingAction(assignmentId, studentId, events, pending)
    } catch {
      // Losing provenance must never cost the student their work or block the
      // page. Put the events back so the next flush retries them.
      buffer.current = [...events, ...buffer.current]
      activeMs.current += pending
    }
  }, [assignmentId, studentId, closeBucket])

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(flush, FLUSH_MS)
    // Leaving the page is the most common end of a writing session, so the last
    // events would otherwise be the ones most often lost.
    const bye = () => void flush()
    window.addEventListener('pagehide', bye)
    return () => {
      clearInterval(id)
      window.removeEventListener('pagehide', bye)
      void flush()
    }
  }, [enabled, flush])

  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (!enabled) return
    const text = e.clipboardData.getData('text') ?? ''
    if (text.length < PASTE_FLOOR) return
    // Marked here rather than inferred from a length jump in the input handler:
    // the paste event is the only place the intent is unambiguous.
    pasting.current = text.length
  }

  function onInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value.length
    setLen(next)
    if (!enabled) {
      lastLen.current = next
      return
    }

    const t = now()
    if (pasting.current > 0) {
      closeBucket()
      buffer.current.push({ t, kind: 'paste', len: next, delta: pasting.current })
      pasting.current = 0
      lastLen.current = next
      return
    }

    const diff = next - lastLen.current
    lastLen.current = next
    if (diff === 0) return
    if (!bucket.current || t - bucket.current.start > BUCKET_MS) {
      closeBucket()
      bucket.current = { start: t, added: 0, removed: 0 }
    }
    if (diff > 0) bucket.current.added += diff
    else bucket.current.removed += -diff
  }

  return (
    <>
      <textarea
        id="text"
        name="text"
        className="lms-textarea"
        defaultValue={defaultValue}
        placeholder="Type your response…"
        onPaste={onPaste}
        onChange={onInput}
        onFocus={() => {
          focusedAt.current = Date.now()
        }}
        onBlur={() => {
          if (focusedAt.current !== null) {
            activeMs.current += Date.now() - focusedAt.current
            focusedAt.current = null
          }
          void flush()
        }}
      />
      <div className="lms-muted" style={{ fontSize: 12, marginTop: 4 }}>
        {len} characters
      </div>
    </>
  )
}
