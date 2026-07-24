import { KIND_META, PROFICIENCY_META, getStandard, type ProficiencyLevel } from '@/lib/bc-curriculum'

/** A coloured chip for a BC proficiency level. */
export function ProficiencyChip({ level, size = 'md' }: { level: ProficiencyLevel; size?: 'sm' | 'md' }) {
  const m = PROFICIENCY_META[level]
  return (
    <span
      className="lms-prof"
      style={{ color: m.color, background: m.bg, fontSize: size === 'sm' ? 11 : 11.5 }}
      title={m.description}
    >
      {m.label}
    </span>
  )
}

/** Read-only list of the standards attached to a piece of coursework. */
export function StandardList({
  standardIds,
  levels,
}: {
  standardIds: string[]
  /** Optional map of standardId → assessed level, to show alongside. */
  levels?: Record<string, ProficiencyLevel>
}) {
  const standards = standardIds.map(getStandard).filter((s) => s != null)
  if (standards.length === 0) return null

  return (
    <div className="lms-stack" style={{ gap: 8 }}>
      {standards.map((s) => (
        <div key={s.id} className="lms-std">
          <span className="lms-std__kind" title={KIND_META[s.kind].label} aria-hidden>
            {KIND_META[s.kind].icon}
          </span>
          <div className="lms-std__body">
            <div className="lms-std__text">{s.text}</div>
            <div className="lms-std__meta">
              <code className="lms-stdpick__code">{s.code}</code>
              <span>{KIND_META[s.kind].label}</span>
              {s.strand && (
                <>
                  <span aria-hidden>·</span>
                  <span>{s.strand}</span>
                </>
              )}
            </div>
          </div>
          {levels?.[s.id] && <ProficiencyChip level={levels[s.id]} />}
        </div>
      ))}
    </div>
  )
}
