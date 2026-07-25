'use client'

import { useOptimistic, useTransition } from 'react'
import { moveModuleItemAction } from './actions'

export type ReorderRow = {
  id: string
  /** Server-rendered row body. Server Components can be passed through as props. */
  content: React.ReactNode
  /** Server-rendered delete control, if the viewer may delete. */
  deleteControl?: React.ReactNode
}

/**
 * Module items with optimistic reordering.
 *
 * The move is a server action followed by a revalidate, so previously the row
 * stayed put for the whole round trip and then jumped — which reads as a missed
 * click, and invites a second click that moves it twice. Here the swap happens
 * locally on press and the action reconciles behind it; if it fails, React drops
 * the optimistic order and the server's order stands.
 */
export function ReorderableItems({
  courseId,
  moduleId,
  rows,
  isTeacher,
}: {
  courseId: string
  moduleId: string
  rows: ReorderRow[]
  isTeacher: boolean
}) {
  const [order, reorder] = useOptimistic(rows.map((r) => r.id))
  const [, start] = useTransition()

  function move(id: string, dir: 'up' | 'down') {
    start(async () => {
      reorder((prev) => {
        const i = prev.indexOf(id)
        const j = dir === 'up' ? i - 1 : i + 1
        if (i < 0 || j < 0 || j >= prev.length) return prev
        const next = [...prev]
        ;[next[i], next[j]] = [next[j], next[i]]
        return next
      })
      await moveModuleItemAction(courseId, moduleId, id, dir)
    })
  }

  const byId = new Map(rows.map((r) => [r.id, r]))

  return (
    <>
      {order.map((id, i) => {
        const row = byId.get(id)
        if (!row) return null
        return (
          <div key={id} className="lms-row" style={{ padding: 0 }}>
            {row.content}
            {isTeacher && (
              <div className="lms-flex lms-gap-sm" style={{ paddingRight: 12 }}>
                <div className="lms-reorder">
                  <button
                    type="button"
                    className="lms-reorder__btn"
                    disabled={i === 0}
                    aria-label="Move up"
                    onClick={() => move(id, 'up')}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="lms-reorder__btn"
                    disabled={i === order.length - 1}
                    aria-label="Move down"
                    onClick={() => move(id, 'down')}
                  >
                    ↓
                  </button>
                </div>
                {row.deleteControl}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
