import Link from 'next/link'
import { courseStandardIds, listRoster, studentMastery } from '@/lib/store'
import {
  KIND_META,
  PROFICIENCY_LEVELS,
  PROFICIENCY_META,
  getStandard,
  type ProficiencyLevel,
  type StandardKind,
} from '@/lib/bc-curriculum'
import type { Course } from '@/lib/types'
import { courseCtx } from '../_shared'
import { Badge, EmptyState } from '../../../_components/ui'
import { ProficiencyChip } from '../../../_components/Standards'

export const dynamic = 'force-dynamic'

const KIND_ORDER: StandardKind[] = ['big-idea', 'curricular-competency', 'content', 'core-competency']

export default async function StandardsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { course, viewer, isTeacher } = await courseCtx(params)
  const standardIds = courseStandardIds(course.id)

  return (
    <div className="lms-stack">
      <div className="lms-between lms-wrap">
        <div>
          <h1 className="lms-h1">Learning standards</h1>
          <p className="lms-sub" style={{ marginBottom: 0 }}>
            {course.curriculum
              ? `BC curriculum — ${course.curriculum.subject} ${course.curriculum.grade}`
              : 'BC curriculum'}
            {' · '}proficiency scale
          </p>
        </div>
        <Legend />
      </div>

      {standardIds.length === 0 ? (
        <EmptyState
          icon="◆"
          title="No standards attached yet"
          hint={isTeacher ? 'Attach BC standards when you create or edit an assignment.' : 'Your teacher hasn’t linked standards yet.'}
        />
      ) : isTeacher ? (
        <MasteryGrid course={course} standardIds={standardIds} />
      ) : (
        <StudentStandards courseId={course.id} studentId={viewer.person.id} standardIds={standardIds} />
      )}
    </div>
  )
}

function Legend() {
  return (
    <div className="lms-flex lms-wrap lms-gap-sm">
      {PROFICIENCY_LEVELS.map((l) => (
        <ProficiencyChip key={l} level={l} size="sm" />
      ))}
    </div>
  )
}

// ---- Teacher: class mastery grid ---------------------------------------

function MasteryGrid({ course, standardIds }: { course: Course; standardIds: string[] }) {
  const roster = listRoster(course.id)
  // studentId → standardId → latest level
  const byStudent = new Map<string, Map<string, ProficiencyLevel | null>>()
  for (const s of roster) {
    const m = new Map<string, ProficiencyLevel | null>()
    for (const row of studentMastery(course.id, s.id)) m.set(row.standardId, row.latest)
    byStudent.set(s.id, m)
  }

  const grouped = KIND_ORDER.map((kind) => ({
    kind,
    ids: standardIds.filter((id) => getStandard(id)?.kind === kind),
  })).filter((g) => g.ids.length > 0)

  return (
    <div className="lms-stack">
      {grouped.map((g) => (
        <section key={g.kind}>
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--lms-ink-faint)', margin: '4px 0 8px' }}>
            {KIND_META[g.kind].icon} {KIND_META[g.kind].plural}
          </h2>
          <div className="lms-tablewrap">
            <table className="lms-table">
              <thead>
                <tr>
                  <th className="lms-table__student lms-mastery__std">Standard</th>
                  {roster.map((s) => (
                    <th key={s.id} className="lms-mastery__cell" title={s.name}>
                      {s.name.split(' ')[0]}
                    </th>
                  ))}
                  <th className="lms-mastery__cell">Class</th>
                </tr>
              </thead>
              <tbody>
                {g.ids.map((sid) => {
                  const std = getStandard(sid)
                  if (!std) return null
                  const levels = roster
                    .map((s) => byStudent.get(s.id)?.get(sid) ?? null)
                    .filter((l): l is ProficiencyLevel => l != null)
                  const proficientOrBetter = levels.filter((l) => l === 'proficient' || l === 'extending').length
                  return (
                    <tr key={sid}>
                      <td className="lms-table__student lms-mastery__std">
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{std.text}</div>
                        <div className="lms-std__meta">
                          <code className="lms-stdpick__code">{std.code}</code>
                          {std.strand && <span>{std.strand}</span>}
                        </div>
                      </td>
                      {roster.map((s) => {
                        const lvl = byStudent.get(s.id)?.get(sid) ?? null
                        return (
                          <td key={s.id} className="lms-mastery__cell">
                            {lvl ? (
                              <span
                                className="lms-prof"
                                style={{ color: PROFICIENCY_META[lvl].color, background: PROFICIENCY_META[lvl].bg, fontSize: 10.5 }}
                                title={`${s.name} — ${PROFICIENCY_META[lvl].label}`}
                              >
                                {PROFICIENCY_META[lvl].short}
                              </span>
                            ) : (
                              <span className="lms-cell-empty">—</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="lms-mastery__cell" style={{ fontWeight: 700, fontSize: 12.5 }}>
                        {levels.length > 0 ? `${proficientOrBetter}/${levels.length}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className="lms-muted" style={{ fontSize: 12.5, margin: 0 }}>
        Each cell shows the student’s <strong>most recent</strong> judgement for that standard. “Class” counts how many
        are Proficient or Extending.
      </p>
    </div>
  )
}

// ---- Student: my proficiency -------------------------------------------

function StudentStandards({ courseId, studentId, standardIds }: { courseId: string; studentId: string; standardIds: string[] }) {
  const mastery = studentMastery(courseId, studentId)
  const assessed = mastery.filter((m) => m.latest != null)
  const counts = PROFICIENCY_LEVELS.map((l) => ({ level: l, n: assessed.filter((m) => m.latest === l).length }))

  const grouped = KIND_ORDER.map((kind) => ({
    kind,
    rows: mastery.filter((m) => getStandard(m.standardId)?.kind === kind),
  })).filter((g) => g.rows.length > 0)

  return (
    <div className="lms-stack">
      <div className="lms-card lms-card--pad">
        <div className="lms-between lms-wrap" style={{ gap: 10 }}>
          <div>
            <div className="lms-muted" style={{ fontSize: 12.5 }}>Standards assessed</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>
              {assessed.length}
              <span className="lms-muted" style={{ fontSize: 15 }}> / {standardIds.length}</span>
            </div>
          </div>
          <div className="lms-flex lms-wrap lms-gap-sm">
            {counts.filter((c) => c.n > 0).map((c) => (
              <span
                key={c.level}
                className="lms-prof"
                style={{ color: PROFICIENCY_META[c.level].color, background: PROFICIENCY_META[c.level].bg }}
              >
                {c.n} {PROFICIENCY_META[c.level].label}
              </span>
            ))}
            {assessed.length === 0 && <Badge tone="muted">Not yet assessed</Badge>}
          </div>
        </div>
      </div>

      {grouped.map((g) => (
        <section key={g.kind}>
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--lms-ink-faint)', margin: '4px 0 8px' }}>
            {KIND_META[g.kind].icon} {KIND_META[g.kind].plural}
          </h2>
          <div className="lms-stack" style={{ gap: 8 }}>
            {g.rows.map((row) => {
              const std = getStandard(row.standardId)
              if (!std) return null
              return (
                <div key={row.standardId} className="lms-std">
                  <div className="lms-std__body">
                    <div className="lms-std__text">{std.text}</div>
                    <div className="lms-std__meta">
                      <code className="lms-stdpick__code">{std.code}</code>
                      {std.strand && <span>{std.strand}</span>}
                    </div>
                    {row.history.length > 0 && (
                      <div className="lms-flex lms-wrap lms-gap-sm" style={{ marginTop: 6 }}>
                        {row.history.map((h, i) => (
                          <Link
                            key={`${h.assignmentId}-${i}`}
                            href={`/courses/${courseId}/assignments/${h.assignmentId}`}
                            className="lms-evidence"
                            title={`${PROFICIENCY_META[h.level].label} — ${h.assignmentTitle}`}
                          >
                            <span style={{ color: PROFICIENCY_META[h.level].color, fontWeight: 700 }}>
                              {PROFICIENCY_META[h.level].short}
                            </span>
                            <span>{h.assignmentTitle}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  {row.latest ? <ProficiencyChip level={row.latest} /> : <Badge tone="muted">Not assessed</Badge>}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
