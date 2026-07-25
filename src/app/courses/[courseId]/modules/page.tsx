import Link from 'next/link'
import { listAssignments, listModules } from '@/lib/store'
import type { CourseModule, ModuleItem } from '@/lib/types'
import { courseCtx } from '../_shared'
import { Badge, EmptyState, InlineDelete, formatBytes } from '../../../_components/ui'
import { HoverLink, SubmitButton } from '../../../_components/interactive'
import { ReorderableItems } from './ReorderableItems'
import {
  addModuleItemAction,
  createModuleAction,
  deleteModuleAction,
  deleteModuleItemAction,
  moveModuleAction,
} from './actions'

export const dynamic = 'force-dynamic'

const ITEM_ICON: Record<ModuleItem['kind'], string> = {
  assignment: '✎',
  page: '❐',
  link: '🔗',
  file: '📄',
}

export default async function ModulesPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { course, isTeacher } = await courseCtx(params)
  const modules = listModules(course.id)
  const assignments = listAssignments(course.id)

  return (
    <div className="lms-stack">
      <div className="lms-between">
        <h1 className="lms-h1">Modules</h1>
      </div>

      {modules.length === 0 && !isTeacher && (
        <EmptyState icon="▤" title="No modules yet" hint="Your teacher hasn't published any modules." />
      )}

      {modules.map((mod, i) => (
        <ModuleCard
          key={mod.id}
          mod={mod}
          courseId={course.id}
          isTeacher={isTeacher}
          assignmentOptions={assignments}
          isFirst={i === 0}
          isLast={i === modules.length - 1}
        />
      ))}

      {isTeacher && (
        <details className="lms-card lms-card--pad">
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>+ New module</summary>
          <form action={createModuleAction.bind(null, course.id)} className="lms-flex" style={{ marginTop: 12, gap: 10 }}>
            <input name="name" className="lms-input" placeholder="Module name, e.g. Unit 2 — Energy" required />
            <SubmitButton className="lms-btn lms-btn--primary">
              Add
            </SubmitButton>
          </form>
        </details>
      )}
    </div>
  )
}

function ReorderControls({
  up,
  down,
  canUp,
  canDown,
}: {
  up: () => Promise<void>
  down: () => Promise<void>
  canUp: boolean
  canDown: boolean
}) {
  return (
    <div className="lms-reorder">
      <form action={up}>
        <button type="submit" className="lms-reorder__btn" disabled={!canUp} aria-label="Move up">
          ↑
        </button>
      </form>
      <form action={down}>
        <button type="submit" className="lms-reorder__btn" disabled={!canDown} aria-label="Move down">
          ↓
        </button>
      </form>
    </div>
  )
}

function ModuleCard({
  mod,
  courseId,
  isTeacher,
  assignmentOptions,
  isFirst,
  isLast,
}: {
  mod: CourseModule
  courseId: string
  isTeacher: boolean
  assignmentOptions: { id: string; title: string }[]
  isFirst: boolean
  isLast: boolean
}) {
  return (
    <div className="lms-card">
      <div className="lms-between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--lms-line)' }}>
        <div className="lms-flex lms-gap-sm">
          <span style={{ fontWeight: 700 }}>{mod.name}</span>
          {!mod.published && <Badge tone="muted">Unpublished</Badge>}
        </div>
        {isTeacher && (
          <div className="lms-flex lms-gap-sm">
            <ReorderControls
              up={moveModuleAction.bind(null, courseId, mod.id, 'up')}
              down={moveModuleAction.bind(null, courseId, mod.id, 'down')}
              canUp={!isFirst}
              canDown={!isLast}
            />
            <InlineDelete action={deleteModuleAction.bind(null, courseId, mod.id)} confirm="Delete this module and its items?" />
          </div>
        )}
      </div>

      {mod.items.length === 0 ? (
        <div className="lms-row lms-muted">No items yet.</div>
      ) : (
        <ReorderableItems
          courseId={courseId}
          moduleId={mod.id}
          isTeacher={isTeacher}
          rows={[...mod.items]
            .sort((a, b) => a.position - b.position)
            .map((item) => ({
              id: item.id,
              content: <ModuleItemRow item={item} courseId={courseId} />,
              deleteControl: (
                <InlineDelete
                  action={deleteModuleItemAction.bind(null, courseId, mod.id, item.id)}
                  confirm="Remove this item?"
                  summary="✕"
                />
              ),
            }))}
        />
      )}

      {isTeacher && (
        <details style={{ padding: '10px 18px 14px' }}>
          <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--lms-ink-soft)' }}>+ Add item</summary>
          <form action={addModuleItemAction.bind(null, courseId, mod.id)} className="lms-stack" style={{ marginTop: 10 }}>
            <div className="lms-form-row">
              <div className="lms-field" style={{ margin: 0 }}>
                <label className="lms-label">Type</label>
                <select name="kind" className="lms-select" defaultValue="assignment">
                  <option value="assignment">Existing assignment</option>
                  <option value="link">External link</option>
                  <option value="file">File upload</option>
                </select>
              </div>
              <div className="lms-field" style={{ margin: 0 }}>
                <label className="lms-label">Assignment</label>
                <select name="assignmentId" className="lms-select" defaultValue="">
                  <option value="">Choose…</option>
                  {assignmentOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="lms-form-row">
              <div className="lms-field" style={{ margin: 0 }}>
                <label className="lms-label">Link title</label>
                <input name="title" className="lms-input" placeholder="(for external link)" />
              </div>
              <div className="lms-field" style={{ margin: 0 }}>
                <label className="lms-label">Link URL</label>
                <input name="url" className="lms-input" placeholder="https://…" />
              </div>
            </div>
            <div className="lms-field" style={{ margin: 0 }}>
              <label className="lms-label">File upload (choose a file)</label>
              <input name="file" type="file" className="lms-input" />
            </div>
            <SubmitButton className="lms-btn lms-btn--primary lms-btn--sm" style={{ alignSelf: 'flex-start' }}>
              Add item
            </SubmitButton>
          </form>
        </details>
      )}
    </div>
  )
}

function ModuleItemRow({ item, courseId }: { item: ModuleItem; courseId: string }) {
  const icon = ITEM_ICON[item.kind]
  const meta =
    item.kind === 'file' && item.fileSize != null ? `File · ${formatBytes(item.fileSize)}` : item.kind
  const inner = (
    <>
      <div className="lms-row__icon" aria-hidden>
        {icon}
      </div>
      <div className="lms-row__main">
        <div className="lms-row__title">{item.title}</div>
        <div className="lms-row__meta">{meta}</div>
      </div>
      {item.kind === 'file' && <span className="lms-badge lms-badge--muted">Download</span>}
    </>
  )

  if (item.kind === 'assignment' && item.refId) {
    return (
      <HoverLink href={`/courses/${courseId}/assignments/${item.refId}`} className="lms-modlink">
        {inner}
      </HoverLink>
    )
  }
  if (item.kind === 'page' && item.refId) {
    return (
      <HoverLink href={`/courses/${courseId}/pages/${item.refId}`} className="lms-modlink">
        {inner}
      </HoverLink>
    )
  }
  if (item.kind === 'link' && item.url) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="lms-modlink">
        {inner}
      </a>
    )
  }
  return <div className="lms-modlink">{inner}</div>
}
