import { notFound } from 'next/navigation'
import { listRoster, getReportComment } from '@/lib/store'
import {
  activeDrafter,
  draftComment,
  gatherEvidence,
  type CommentEvidence,
  type EvidenceItem,
} from '@/lib/report-comments'
import { PROFICIENCY_META } from '@/lib/bc-curriculum'
import { ProficiencyChip } from '../../../../_components/Standards'
import { courseCtx } from '../_shared'
import { Avatar, Badge, EmptyState } from '../../../../_components/ui'
import { HoverLink } from '../../../../_components/interactive'
import { CommentEditor } from './CommentEditor'

export const dynamic = 'force-dynamic'

export default async function ReportsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { course, isTeacher } = await courseCtx(params)
  if (!isTeacher) notFound()

  const roster = await listRoster(course.id)
  const drafter = activeDrafter()

  const rows = await Promise.all(
    roster.map(async (student) => {
      const evidence = await gatherEvidence(course.id, student.id)
      if (!evidence) return null
      const [draft, saved] = await Promise.all([
        draftComment(evidence),
        getReportComment(course.id, student.id),
      ])
      return { student, evidence, draft, saved }
    }),
  )
  const entries = rows.filter((r) => r != null)
  const written = entries.filter((e) => e.saved).length

  return (
    <div className="lms-stack">
      <div className="lms-header">
        <div>
          <span className="lms-eyebrow">{course.code} · {course.term}</span>
          <h1 className="lms-h1">Report comments</h1>
          <p className="lms-sub">
            A starting draft for each student, built from the proficiency judgements you already recorded and the
            work that evidenced them. Every draft is yours to rewrite — nothing is filed until you save it.
          </p>
        </div>
        <div className="lms-flex lms-gap-sm">
          <Badge tone={written === entries.length ? 'ok' : 'muted'}>
            {written} of {entries.length} written
          </Badge>
        </div>
      </div>

      <div className="lms-card lms-card--pad lms-flex" style={{ gap: 10, alignItems: 'flex-start' }}>
        <span aria-hidden style={{ fontSize: 18 }}>◆</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>Drafted by: {drafter.label}</div>
          <div className="lms-muted" style={{ fontSize: 12.5, marginTop: 2 }}>
            {drafter.id === 'structured'
              ? 'Runs entirely in the app — no student work leaves the building. Swapping in a language model is a deliberate, separate decision.'
              : 'A language model is drafting these. Student evidence is being sent to that provider.'}
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyState icon="👥" title="No students enrolled" hint="Add students to this course first." />
      ) : (
        entries.map(({ student, evidence, draft, saved }) => (
          <section key={student.id} className="lms-card lms-card--pad lms-stack">
            <div className="lms-between lms-wrap">
              <div className="lms-flex">
                <Avatar person={student} size={34} />
                <div>
                  <div style={{ fontWeight: 700 }}>{student.name}</div>
                  <div className="lms-row__meta">
                    {evidence.reporting.kind === 'letter-grade'
                      ? `Graduation Program · letter grade and percentage`
                      : `Grade ${evidence.reporting.grade} · proficiency scale`}
                  </div>
                </div>
              </div>
              {evidence.reporting.kind === 'letter-grade' && evidence.reporting.result.letter && (
                <Badge tone="info">
                  {evidence.reporting.result.letter} · {evidence.reporting.result.pct}%
                </Badge>
              )}
            </div>

            {draft.cautions.length > 0 && (
              <div className="lms-callout lms-callout--warn">
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {draft.cautions.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            <CommentEditor
              courseId={course.id}
              studentId={student.id}
              draft={draft.body}
              drafterId={draft.drafterId}
              saved={saved?.body ?? null}
              savedAt={saved?.updatedAt ?? null}
            />

            <Evidence courseId={course.id} evidence={evidence} />
          </section>
        ))
      )}
    </div>
  )
}

/**
 * The evidence behind the draft, shown rather than hidden.
 *
 * A teacher is being asked to put their name to this. They should be able to see
 * exactly which judgements it drew on, and click through to the work — otherwise
 * it is a black box asking for a signature.
 */
function Evidence({ courseId, evidence }: { courseId: string; evidence: CommentEvidence }) {
  const h = evidence.workHabits
  return (
    <details className="lms-evidence-panel">
      <summary>
        Evidence used — {evidence.strengths.length} at proficient or better, {evidence.growing.length} still
        developing
        {evidence.notAssessed.length > 0 && `, ${evidence.notAssessed.length} not yet assessed`}
      </summary>

      <div className="lms-stack" style={{ marginTop: 12, gap: 14 }}>
        {evidence.improved.length > 0 && (
          <div>
            <h3 className="lms-dash__h2" style={{ marginBottom: 6 }}>Growth over the term</h3>
            <div className="lms-stack" style={{ gap: 6 }}>
              {evidence.improved.map((g) => (
                <div key={g.standardId} className="lms-row__meta">
                  <code className="lms-stdpick__code">{g.code}</code>{' '}
                  {PROFICIENCY_META[g.from].label} → <strong>{PROFICIENCY_META[g.to].label}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        <EvidenceGroup title="Demonstrated" items={evidence.strengths} courseId={courseId} />
        <EvidenceGroup title="Still developing" items={evidence.growing} courseId={courseId} />

        {evidence.notAssessed.length > 0 && (
          <div>
            <h3 className="lms-dash__h2" style={{ marginBottom: 6 }}>No evidence recorded</h3>
            <div className="lms-muted" style={{ fontSize: 12.5 }}>
              {evidence.notAssessed.map((s) => s.code).join(', ')}
            </div>
          </div>
        )}

        <div>
          <h3 className="lms-dash__h2" style={{ marginBottom: 6 }}>Work habits</h3>
          <div className="lms-flex lms-wrap lms-gap-sm">
            <Badge tone="muted">{h.submitted}/{h.assigned} submitted</Badge>
            {h.onTime > 0 && <Badge tone="ok">{h.onTime} on time</Badge>}
            {h.late > 0 && <Badge tone="warn">{h.late} late</Badge>}
            {h.missing > 0 && <Badge tone="danger">{h.missing} missing</Badge>}
          </div>
        </div>

        {evidence.teacherFeedback.length > 0 && (
          <div>
            <h3 className="lms-dash__h2" style={{ marginBottom: 6 }}>Your feedback on this student&rsquo;s work</h3>
            <div className="lms-stack" style={{ gap: 6 }}>
              {evidence.teacherFeedback.slice(0, 3).map((f, i) => (
                <div key={i} className="lms-row__meta">
                  <strong>{f.assignmentTitle}:</strong> {f.feedback}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  )
}

function EvidenceGroup({
  title,
  items,
  courseId,
}: {
  title: string
  items: EvidenceItem[]
  courseId: string
}) {
  if (items.length === 0) return null
  return (
    <div>
      <h3 className="lms-dash__h2" style={{ marginBottom: 6 }}>{title}</h3>
      <div className="lms-stack" style={{ gap: 6 }}>
        {items.map((s) => (
          <div key={s.standardId} className="lms-flex lms-wrap" style={{ gap: 8, alignItems: 'baseline' }}>
            <ProficiencyChip level={s.level} size="sm" />
            <code className="lms-stdpick__code">{s.code}</code>
            <span style={{ fontSize: 12.5, flex: 1, minWidth: 200 }}>{s.text}</span>
            {s.source && (
              <HoverLink
                href={`/lms/courses/${courseId}/assignments/${s.source.assignmentId}`}
                className="lms-evidence"
              >
                {s.source.title}
              </HoverLink>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
