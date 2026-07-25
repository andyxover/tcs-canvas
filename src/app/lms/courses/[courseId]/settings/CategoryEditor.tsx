'use client'

import { useState } from 'react'
import type { GradeCategory } from '@/lib/types'

/**
 * Dynamic grade-category rows (name + weight%) rendered as named form fields so
 * saveCourseSettingsAction can parse them. The weights only matter when the
 * course's calc mode is 'weighted'.
 */
export function CategoryEditor({ defaultCategories }: { defaultCategories: GradeCategory[] }) {
  const [cats, setCats] = useState<GradeCategory[]>(
    defaultCategories.length > 0 ? defaultCategories : [{ name: '', weight: 0 }],
  )

  const total = cats.reduce((n, c) => n + (Number(c.weight) || 0), 0)

  const set = (i: number, patch: Partial<GradeCategory>) =>
    setCats((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  const add = () => setCats((cs) => [...cs, { name: '', weight: 0 }])
  const remove = (i: number) => setCats((cs) => (cs.length <= 1 ? cs : cs.filter((_, j) => j !== i)))

  return (
    <div className="lms-stack" style={{ gap: 8 }}>
      <input type="hidden" name="catCount" value={cats.length} />
      {cats.map((c, i) => (
        <div key={i} className="lms-flex" style={{ gap: 8 }}>
          <input
            className="lms-input"
            name={`cat-${i}-name`}
            value={c.name}
            onChange={(e) => set(i, { name: e.target.value })}
            placeholder="Category name"
          />
          <div style={{ position: 'relative', width: 110, flexShrink: 0 }}>
            <input
              className="lms-input"
              name={`cat-${i}-weight`}
              type="number"
              min={0}
              max={100}
              value={c.weight}
              onChange={(e) => set(i, { weight: Number(e.target.value) })}
              style={{ paddingRight: 26 }}
            />
            <span style={{ position: 'absolute', right: 10, top: 10, color: 'var(--lms-ink-faint)', fontSize: 13 }}>%</span>
          </div>
          {cats.length > 1 && (
            <button type="button" className="lms-btn lms-btn--ghost lms-btn--sm" onClick={() => remove(i)} aria-label="Remove category">
              ✕
            </button>
          )}
        </div>
      ))}
      <div className="lms-between">
        <button type="button" className="lms-btn lms-btn--sm" onClick={add} style={{ alignSelf: 'flex-start' }}>
          + Add category
        </button>
        <span className="lms-faint" style={{ fontSize: 12.5 }} data-testid="weight-total">
          Total: {total}%{total !== 100 ? ' (weighted mode expects 100%)' : ' ✓'}
        </span>
      </div>
    </div>
  )
}
