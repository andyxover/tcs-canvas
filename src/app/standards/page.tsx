import { notFound } from 'next/navigation'
import { getViewer } from '@/lib/session'
import { KIND_META, isImported, listCurricula, listStandards } from '@/lib/bc-curriculum'
import { Badge } from '../_components/ui'
import { ImportForm } from './ImportForm'
import { resetStandardsAction } from './actions'
import { SubmitButton } from '../_components/interactive'

export const dynamic = 'force-dynamic'

export default async function StandardsCataloguePage() {
  const viewer = await getViewer()
  if (viewer.kind !== 'teacher') notFound()

  const all = listStandards()
  const curricula = listCurricula()
  const importedCount = all.filter((s) => isImported(s.id)).length

  const byKind = (['big-idea', 'curricular-competency', 'content', 'core-competency'] as const).map((k) => ({
    kind: k,
    n: all.filter((s) => s.kind === k).length,
  }))

  return (
    <main className="lms-page">
      <div className="lms-header">
        <div>
          <h1 className="lms-h1">Standards catalogue</h1>
          <p className="lms-sub">
            The BC learning standards available to attach to coursework. Import the official data to extend or correct
            what ships with the app.
          </p>
        </div>
      </div>

      <div className="lms-dash">
        <div className="lms-dash__main lms-stack">
          <h2 className="lms-dash__h2">Import standards</h2>
          <p className="lms-muted" style={{ margin: 0, fontSize: 13 }}>
            Export from{' '}
            <a
              href="https://curriculum.gov.bc.ca"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--lms-accent)', textDecoration: 'underline' }}
            >
              curriculum.gov.bc.ca
            </a>{' '}
            (or your own scope-and-sequence) into a spreadsheet, then upload it here. Importing a standard whose code
            already exists updates it in place, so you can re-upload a corrected file safely.
          </p>
          <ImportForm />
        </div>

        <aside className="lms-dash__side lms-stack">
          <div>
            <h2 className="lms-dash__h2" style={{ marginBottom: 10 }}>
              In the catalogue
            </h2>
            <div className="lms-card lms-card--pad">
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em' }}>{all.length}</div>
              <div className="lms-muted">
                standards
                {importedCount > 0 && (
                  <>
                    {' '}
                    · <strong>{importedCount}</strong> imported
                  </>
                )}
              </div>
              <div className="lms-flex lms-wrap lms-gap-sm" style={{ marginTop: 12 }}>
                {byKind.map((k) => (
                  <Badge key={k.kind} tone="muted">
                    {KIND_META[k.kind].icon} {k.n}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h2 className="lms-dash__h2" style={{ marginBottom: 10 }}>
              Curricula
            </h2>
            <div className="lms-stack" style={{ gap: 6 }}>
              {curricula.map((c) => (
                <div key={`${c.subject}-${c.grade}`} className="lms-hub-row">
                  <div className="lms-hub-row__main">
                    <div className="lms-hub-row__title">{c.subject}</div>
                    <div className="lms-row__meta">Grade {c.grade}</div>
                  </div>
                  <Badge tone="muted">{c.count}</Badge>
                </div>
              ))}
            </div>
          </div>

          {importedCount > 0 && (
            <form action={resetStandardsAction}>
              <SubmitButton className="lms-btn lms-btn--sm lms-btn--danger-ghost">
                Remove {importedCount} imported standard{importedCount === 1 ? '' : 's'}
              </SubmitButton>
            </form>
          )}
        </aside>
      </div>
    </main>
  )
}
