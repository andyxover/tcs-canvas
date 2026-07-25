/**
 * Skeleton primitives for route-level loading.tsx files.
 *
 * Every route in the app is dynamic (each one reads the viewer cookie), and Next
 * skips prefetching dynamic routes unless the segment has a loading.tsx. These
 * exist so each segment can ship one cheaply: the shell gets prefetched, the
 * click paints in the same frame, and the real content streams in behind it.
 *
 * Skeletons should echo the destination's actual shape — the point is to hold
 * the layout, not to decorate the wait.
 */

export function Skel({ w, h, className = '' }: { w?: number | string; h?: number | string; className?: string }) {
  return <span className={`lms-skel ${className}`} style={{ width: w, height: h }} aria-hidden />
}

export function SkelText({ w = '100%' }: { w?: number | string }) {
  return <Skel className="lms-skel--text" w={w} />
}

/** Page title + subtitle, matching .lms-header. */
export function SkelHeader({ sub = true }: { sub?: boolean }) {
  return (
    <div className="lms-header">
      <div style={{ display: 'grid', gap: 10 }}>
        <Skel className="lms-skel--title" w={240} />
        {sub && <SkelText w={380} />}
      </div>
    </div>
  )
}

/** A stack of list rows — assignments, people, modules, announcements. */
export function SkelRows({ n = 5, lead = false }: { n?: number; lead?: boolean }) {
  return (
    <div className="lms-stack" style={{ gap: 8 }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="lms-skel-row">
          {lead && <Skel w={34} h={34} className="lms-skel--chip" />}
          <span className="lms-skel-row__main">
            <SkelText w={`${68 - (i % 3) * 12}%`} />
            <SkelText w={`${38 - (i % 2) * 8}%`} />
          </span>
          <Skel className="lms-skel--chip" w={66} />
        </div>
      ))}
    </div>
  )
}

/** A grid of cards — the course hub. */
export function SkelCards({ n = 4 }: { n?: number }) {
  return (
    <div className="lms-courses">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="lms-card lms-card--pad" style={{ display: 'grid', gap: 10 }}>
          <Skel w={54} h={54} />
          <SkelText w="72%" />
          <SkelText w="46%" />
        </div>
      ))}
    </div>
  )
}

/** Gradebook / mastery grid / roster tables. */
export function SkelTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="lms-tablewrap">
      <table className="lms-table">
        <thead>
          <tr>
            {Array.from({ length: cols }, (_, c) => (
              <th key={c}>
                <SkelText w={c === 0 ? 120 : 62} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }, (_, c) => (
                <td key={c}>
                  <SkelText w={c === 0 ? 140 : 44} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Long-form body copy — syllabus, pages, assignment detail. */
export function SkelProse({ lines = 6 }: { lines?: number }) {
  return (
    <div className="lms-card lms-card--pad lms-stack" style={{ gap: 12 }}>
      {Array.from({ length: lines }, (_, i) => (
        <SkelText key={i} w={i === lines - 1 ? '52%' : `${100 - (i % 4) * 7}%`} />
      ))}
    </div>
  )
}

/** The standard page shell every loading.tsx wraps itself in. */
export function SkelPage({ children, sub = true }: { children: React.ReactNode; sub?: boolean }) {
  return (
    <main className="lms-page" aria-busy="true" aria-label="Loading">
      <SkelHeader sub={sub} />
      {children}
    </main>
  )
}
