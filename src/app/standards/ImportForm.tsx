'use client'

import { useActionState } from 'react'
import { confirmImportAction, previewImportAction, type ImportState } from './actions'
import { CSV_TEMPLATE, IMPORT_COLUMNS } from '@/lib/standards-import'

const EMPTY: ImportState = { status: 'idle' }

export function ImportForm() {
  const [state, preview, previewPending] = useActionState(previewImportAction, EMPTY)
  const [confirmState, confirm, confirmPending] = useActionState(confirmImportAction, EMPTY)

  // Once a commit succeeds, that result supersedes the preview.
  const done = confirmState.status === 'done'

  return (
    <div className="lms-stack">
      {done && (
        <div className="lms-card lms-card--pad lms-flex" style={{ gap: 10, borderColor: 'var(--lms-ok)' }}>
          <span style={{ fontSize: 22 }} aria-hidden>
            ✅
          </span>
          <div>
            <div style={{ fontWeight: 700 }}>Import complete</div>
            <div className="lms-muted" style={{ fontSize: 13 }}>{confirmState.message}</div>
          </div>
        </div>
      )}

      <form action={preview} className="lms-card lms-card--pad lms-stack">
        <div>
          <label className="lms-label" htmlFor="file">
            Upload a CSV or JSON file
          </label>
          <input id="file" name="file" type="file" accept=".csv,.json,text/csv,application/json" className="lms-input" />
        </div>

        <div>
          <label className="lms-label" htmlFor="raw">
            …or paste the data
          </label>
          <textarea
            id="raw"
            name="raw"
            className="lms-textarea"
            style={{ minHeight: 160, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5 }}
            placeholder={CSV_TEMPLATE}
            defaultValue={state.raw ?? ''}
          />
          <div className="lms-muted" style={{ fontSize: 12, marginTop: 6 }}>
            Columns: <code className="lms-stdpick__code">{IMPORT_COLUMNS.join(', ')}</code> — <em>strand</em> is optional.
            Kind accepts “Big Idea”, “Curricular Competency”, “Content”, or “Core Competency”.
          </div>
        </div>

        <button type="submit" className="lms-btn lms-btn--primary" style={{ alignSelf: 'flex-start' }} disabled={previewPending}>
          {previewPending ? 'Checking…' : 'Check file'}
        </button>
      </form>

      {state.status === 'error' && (
        <div className="lms-card lms-card--pad" style={{ borderColor: 'var(--lms-danger)' }}>
          <div style={{ fontWeight: 700, color: 'var(--lms-danger)' }}>Could not import</div>
          <div className="lms-muted" style={{ fontSize: 13, marginTop: 4 }}>{state.message}</div>
          {(state.preview?.issues.length ?? 0) > 0 && <IssueList issues={state.preview!.issues} />}
        </div>
      )}

      {state.status === 'preview' && state.preview && !done && (
        <div className="lms-card lms-card--pad lms-stack">
          <div className="lms-between lms-wrap">
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Ready to import</div>
              <div className="lms-muted" style={{ fontSize: 13 }}>
                {state.preview.total} standard{state.preview.total === 1 ? '' : 's'} parsed
                {state.preview.duplicates > 0 && ` · ${state.preview.duplicates} duplicate row${state.preview.duplicates === 1 ? '' : 's'} merged`}
                {state.preview.issues.length > 0 && ` · ${state.preview.issues.length} row${state.preview.issues.length === 1 ? '' : 's'} skipped`}
              </div>
            </div>
            <form action={confirm}>
              <input type="hidden" name="raw" value={state.raw ?? ''} />
              <button type="submit" className="lms-btn lms-btn--primary" disabled={confirmPending}>
                {confirmPending ? 'Importing…' : `Import ${state.preview.total}`}
              </button>
            </form>
          </div>

          <div className="lms-flex lms-wrap lms-gap-sm">
            {state.preview.curricula.map((c) => (
              <span key={`${c.subject}-${c.grade}`} className="lms-badge lms-badge--info">
                {c.subject} {c.grade} · {c.count}
              </span>
            ))}
          </div>

          <div className="lms-tablewrap">
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Kind</th>
                  <th>Standard</th>
                </tr>
              </thead>
              <tbody>
                {state.preview.sample.map((s) => (
                  <tr key={s.code}>
                    <td>
                      <code className="lms-stdpick__code">{s.code}</code>
                    </td>
                    <td className="lms-muted">{s.kind}</td>
                    <td style={{ whiteSpace: 'normal', maxWidth: 520 }}>{s.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {state.preview.total > state.preview.sample.length && (
            <div className="lms-muted" style={{ fontSize: 12.5 }}>
              Showing the first {state.preview.sample.length} of {state.preview.total}.
            </div>
          )}

          {state.preview.issues.length > 0 && <IssueList issues={state.preview.issues} />}
        </div>
      )}
    </div>
  )
}

function IssueList({ issues }: { issues: { row: number; message: string }[] }) {
  return (
    <details style={{ marginTop: 10 }}>
      <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--lms-warn)', fontWeight: 600 }}>
        {issues.length} row{issues.length === 1 ? '' : 's'} skipped
      </summary>
      <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 12.5, color: 'var(--lms-ink-soft)' }}>
        {issues.slice(0, 20).map((i, n) => (
          <li key={n}>
            {i.row > 0 ? `Row ${i.row}: ` : ''}
            {i.message}
          </li>
        ))}
        {issues.length > 20 && <li>…and {issues.length - 20} more.</li>}
      </ul>
    </details>
  )
}
