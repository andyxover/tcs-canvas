'use client'

import { useState } from 'react'
import { KIND_META, type BcStandard, type StandardKind } from '@/lib/bc-curriculum'

const ORDER: StandardKind[] = ['big-idea', 'curricular-competency', 'content', 'core-competency']

/**
 * Checkbox tree of BC learning standards, grouped by kind (Big Ideas /
 * Curricular Competencies / Content / Core Competencies) and, within
 * competencies, by strand. Selections post as repeated `standardIds` fields.
 */
export function StandardPicker({
  available,
  defaultSelected = [],
}: {
  available: BcStandard[]
  defaultSelected?: string[]
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelected))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const groups = ORDER.map((kind) => ({ kind, items: available.filter((s) => s.kind === kind) })).filter(
    (g) => g.items.length > 0,
  )

  return (
    <div className="lms-stdpick">
      <div className="lms-between" style={{ marginBottom: 8 }}>
        <span className="lms-muted" style={{ fontSize: 12.5 }}>
          Tick the standards this work gives evidence for.
        </span>
        <span className="lms-badge lms-badge--info">{selected.size} selected</span>
      </div>

      {groups.map((g) => {
        // Group competencies by strand for readability.
        const strands = [...new Set(g.items.map((s) => s.strand ?? ''))]
        return (
          <details key={g.kind} className="lms-stdpick__group" open={g.kind === 'big-idea'}>
            <summary>
              <span aria-hidden style={{ marginRight: 6 }}>
                {KIND_META[g.kind].icon}
              </span>
              {KIND_META[g.kind].plural}
              <span className="lms-faint" style={{ fontWeight: 400, marginLeft: 6 }}>
                ({g.items.filter((s) => selected.has(s.id)).length}/{g.items.length})
              </span>
            </summary>
            <div className="lms-stdpick__body">
              {strands.map((strand) => (
                <div key={strand || 'none'}>
                  {strand && <div className="lms-stdpick__strand">{strand}</div>}
                  {g.items
                    .filter((s) => (s.strand ?? '') === strand)
                    .map((s) => (
                      <label key={s.id} className="lms-stdpick__item">
                        <input
                          type="checkbox"
                          name="standardIds"
                          value={s.id}
                          checked={selected.has(s.id)}
                          onChange={() => toggle(s.id)}
                        />
                        <span>
                          <code className="lms-stdpick__code">{s.code}</code> {s.text}
                        </span>
                      </label>
                    ))}
                </div>
              ))}
            </div>
          </details>
        )
      })}
    </div>
  )
}
