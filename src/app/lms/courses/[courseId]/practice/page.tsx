import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCourse } from '@/lib/store'
import { getViewer } from '@/lib/session'
import { gatherPracticePlan } from '@/lib/practice'
import { PROFICIENCY_META } from '@/lib/bc-curriculum'
import { llmConfigured } from '@/lib/ai/anthropic'
import { PracticePanel } from './PracticePanel'
import { Badge } from '../../../../_components/ui'

export const dynamic = 'force-dynamic'

/**
 * The student's own practice surface.
 *
 * Teachers have no view here on purpose. A teacher wanting to know what a
 * student is weak on already has the Standards mastery grid, which is the
 * authoritative version; a second, differently-shaped copy of it would only
 * invite the two to disagree. What a teacher does get from this feature is the
 * flag queue, which lives on Standards next to the grid it belongs beside.
 */
export default async function PracticePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  const course = await getCourse(courseId)
  if (!course) notFound()
  const viewer = await getViewer()
  if (viewer.kind !== 'student') notFound()

  const plan = await gatherPracticePlan(courseId, viewer.person.id)
  if (!plan) notFound()

  const configured = llmConfigured()
  const behind = plan.targets.filter((t) => t.reason === 'behind')
  const untested = plan.targets.filter((t) => t.reason === 'not-assessed')

  return (
    <div className="lms-stack">
      <header>
        <h1 className="lms-h1">Practice</h1>
        <p className="lms-muted" style={{ maxWidth: '62ch' }}>
          Built from what has actually been assessed in {course.name} — not a generic revision list. Nothing here is
          marked, and none of it changes your grade.
        </p>
      </header>

      {plan.targets.length === 0 && (
        <div className="lms-card lms-card--pad">
          <strong>Nothing is flagged for practice right now.</strong>
          <p className="lms-muted" style={{ margin: '6px 0 0' }}>
            Every standard assessed so far in this course is at Proficient or above.
          </p>
        </div>
      )}

      {behind.length > 0 && (
        <section>
          <h2 className="lms-dash__h2">Worth your time first</h2>
          <p className="lms-muted" style={{ fontSize: 13, marginTop: 0 }}>
            Standards where your most recent recorded level is Emerging or Developing, hardest first.
          </p>
          <div className="lms-stack">
            {behind.map((t) => (
              <article key={t.standardId} className="lms-card lms-card--pad lms-stack" style={{ gap: 8 }}>
                <div className="lms-between lms-wrap" style={{ gap: 8 }}>
                  <div>
                    <code className="lms-stdpick__code">{t.code}</code>{' '}
                    <span className="lms-muted" style={{ fontSize: 12.5 }}>
                      {t.kind}
                      {t.strand ? ` · ${t.strand}` : ''}
                    </span>
                  </div>
                  {t.currentLevel && (
                    <Badge tone={t.currentLevel === 'emerging' ? 'danger' : 'info'}>
                      {PROFICIENCY_META[t.currentLevel].label}
                    </Badge>
                  )}
                </div>

                <div style={{ fontSize: 14 }}>{t.text}</div>

                {t.nextLevel && (
                  <div className="lms-muted" style={{ fontSize: 13 }}>
                    <strong>{t.nextLevel.label}</strong> means {lower(t.nextLevel.description)}
                  </div>
                )}

                {t.evidencedIn.length > 0 && (
                  <div style={{ fontSize: 13 }}>
                    <span className="lms-muted">Go back to: </span>
                    {t.evidencedIn.map((e, i) => (
                      <span key={e.assignmentId}>
                        {i > 0 && ', '}
                        <Link href={`/lms/courses/${courseId}/assignments/${e.assignmentId}`}>{e.title}</Link>
                      </span>
                    ))}
                  </div>
                )}

                <PracticePanel courseId={courseId} standardId={t.standardId} code={t.code} configured={configured} />
              </article>
            ))}
          </div>
        </section>
      )}

      {untested.length > 0 && (
        <section>
          <h2 className="lms-dash__h2">Not assessed yet</h2>
          <p className="lms-muted" style={{ fontSize: 13, marginTop: 0 }}>
            These are part of the course but nothing has measured them for you yet. That does not mean you are behind on
            them — only that there is no evidence either way.
          </p>
          <div className="lms-stack">
            {untested.map((t) => (
              <article key={t.standardId} className="lms-card lms-card--pad lms-stack" style={{ gap: 8 }}>
                <div>
                  <code className="lms-stdpick__code">{t.code}</code>{' '}
                  <span className="lms-muted" style={{ fontSize: 12.5 }}>
                    {t.kind}
                  </span>
                </div>
                <div style={{ fontSize: 14 }}>{t.text}</div>
                <PracticePanel courseId={courseId} standardId={t.standardId} code={t.code} configured={configured} />
              </article>
            ))}
          </div>
        </section>
      )}

      {plan.secure.length > 0 && (
        <section>
          <h2 className="lms-dash__h2">Already solid</h2>
          <div className="lms-card lms-card--pad">
            <div className="lms-stack" style={{ gap: 6 }}>
              {plan.secure.map((s) => (
                <div key={s.code} className="lms-between lms-wrap" style={{ gap: 8, fontSize: 13 }}>
                  <span>
                    <code className="lms-stdpick__code">{s.code}</code> {s.text}
                  </span>
                  <Badge tone="ok">{PROFICIENCY_META[s.level].label}</Badge>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1)
}
