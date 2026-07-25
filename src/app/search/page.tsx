import Link from 'next/link'
import { getViewer } from '@/lib/session'
import { search } from '@/lib/store'
import { Badge, EmptyState } from '../_components/ui'
import { HoverLink } from '../_components/interactive'

export const dynamic = 'force-dynamic'

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams
  const viewer = await getViewer()
  const results = search(q, viewer.kind, viewer.person.id)
  const total = results.courses.length + results.assignments.length + results.people.length

  return (
    <main className="lms-page">
      <div className="lms-header">
        <div>
          <h1 className="lms-h1">Search</h1>
          <p className="lms-sub">
            {q ? (
              <>
                {total} {total === 1 ? 'result' : 'results'} for “{q}”
              </>
            ) : (
              'Type in the search box above to find courses, assignments, and people.'
            )}
          </p>
        </div>
      </div>

      {q && total === 0 && <EmptyState icon="🔍" title="No matches" hint="Try a different word." />}

      {results.courses.length > 0 && (
        <Section title="Courses">
          {results.courses.map((c) => (
            <HoverLink key={c.id} href={`/courses/${c.id}`} className="lms-hub-row">
              <span aria-hidden className="lms-hub-row__accent" style={{ background: c.color }} />
              <div className="lms-hub-row__main">
                <div className="lms-hub-row__title">{c.name}</div>
                <div className="lms-row__meta">{c.code}</div>
              </div>
            </HoverLink>
          ))}
        </Section>
      )}

      {results.assignments.length > 0 && (
        <Section title="Assignments">
          {results.assignments.map((a) => (
            <HoverLink key={a.id} href={`/courses/${a.courseId}/assignments/${a.id}`} className="lms-hub-row">
              <span aria-hidden style={{ width: 22, textAlign: 'center' }}>
                {a.isQuiz ? '◎' : '✎'}
              </span>
              <div className="lms-hub-row__main">
                <div className="lms-hub-row__title">
                  {a.title}
                  {a.isQuiz && <span style={{ marginLeft: 6 }}><Badge tone="info">Quiz</Badge></span>}
                </div>
                <div className="lms-row__meta">{a.courseName}</div>
              </div>
            </HoverLink>
          ))}
        </Section>
      )}

      {results.people.length > 0 && (
        <Section title="People">
          {results.people.map((p, i) => (
            <div key={`${p.id}-${i}`} className="lms-hub-row">
              <span aria-hidden style={{ width: 22, textAlign: 'center' }}>
                {p.role === 'Teacher' ? '★' : '☺'}
              </span>
              <div className="lms-hub-row__main">
                <div className="lms-hub-row__title">{p.name}</div>
                <div className="lms-row__meta">
                  {p.role} · {p.courseName}
                </div>
              </div>
            </div>
          ))}
        </Section>
      )}
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--lms-ink-faint)', margin: '0 0 8px' }}>
        {title}
      </h2>
      <div className="lms-stack" style={{ gap: 8 }}>
        {children}
      </div>
    </section>
  )
}
