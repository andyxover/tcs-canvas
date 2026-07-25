import { curve, fmtMinutes, type ProvenanceSummary } from '@/lib/provenance'

/**
 * How one student's draft came to exist.
 *
 * Reads as a record, not a report card on their honesty. There is no headline
 * number, no colour-coded risk, and no ranking of students by anything — all of
 * which would be read as an accusation however it was captioned, and none of
 * which the underlying data supports.
 */
export function WritingProcess({ summary }: { summary: ProvenanceSummary | null }) {
  if (!summary) {
    return (
      <div className="lms-muted" style={{ fontSize: 13 }}>
        No writing recorded — they may have worked elsewhere and pasted, or not started in the box.
      </div>
    )
  }

  const pts = curve(summary.events)
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
  const pastes = summary.events
    .map((e, i) => ({ e, p: pts[i] }))
    .filter(({ e }) => e.kind === 'paste')

  return (
    <div className="lms-stack" style={{ gap: 10 }}>
      <div className="lms-provenance">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="lms-provenance__chart" role="img"
             aria-label={`Length over time. ${summary.pastes.count} paste${summary.pastes.count === 1 ? '' : 's'}.`}>
          {/* Vertical ticks rather than dots. preserveAspectRatio="none" stretches
              this box to roughly 900x90, which flattens any circle into an
              unreadable sliver; a vertical line survives that scaling intact.
              Weight carries paste size, clamped so a big paste reads as a
              thicker mark and never as an alarm. */}
          {pastes.map(({ e, p }, i) => (
            <line
              key={i}
              x1={p.x}
              y1={0}
              x2={p.x}
              y2={100}
              className="lms-provenance__paste"
              strokeWidth={Math.min(5, 1.5 + e.delta / 400)}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={path} className="lms-provenance__line" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="lms-provenance__axis">
          <span>started</span>
          {summary.pastes.count > 0 && <span>│ marks a paste</span>}
          <span>handed in</span>
        </div>
      </div>

      <dl className="lms-provenance__stats">
        <Stat label="Time in the box" value={fmtMinutes(summary.activeMinutes)} />
        <Stat
          label="Sittings"
          value={String(summary.sittings)}
          sub={summary.spanMinutes > summary.activeMinutes ? `over ${fmtMinutes(summary.spanMinutes)}` : undefined}
        />
        <Stat label="Typed" value={`${summary.typed.toLocaleString()} chars`} />
        <Stat
          label="Pasted"
          value={summary.pastes.count === 0 ? 'none' : `${summary.pastes.total.toLocaleString()} chars`}
          sub={
            summary.pastes.count > 0
              ? `${summary.pastes.count} paste${summary.pastes.count === 1 ? '' : 's'}, largest ${summary.pastes.largest.toLocaleString()}`
              : undefined
          }
        />
        {summary.pastedShare !== null && summary.pastes.count > 0 && (
          <Stat label="Of what was handed in" value={`${Math.round(summary.pastedShare * 100)}% arrived pasted`} />
        )}
      </dl>

      <p className="lms-muted" style={{ fontSize: 12, margin: 0, lineHeight: 1.55, maxWidth: '68ch' }}>
        This is a record of how the text arrived in the box, not a judgement about it. Pasting is not against any rule —
        students draft in other apps, write on their phones, and reuse their own notes. If something here raises a
        question, the question is for the student.
      </p>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="lms-muted" style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.05em' }}>
        {label}
      </dt>
      <dd style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 600 }}>{value}</dd>
      {sub && (
        <dd className="lms-muted" style={{ margin: 0, fontSize: 12 }}>
          {sub}
        </dd>
      )}
    </div>
  )
}
