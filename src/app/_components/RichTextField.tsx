'use client'

import { Suspense, lazy } from 'react'

const Editor = lazy(() => import('./RichTextEditor').then((m) => ({ default: m.RichTextEditor })))

type Props = {
  name: string
  defaultHTML?: string
  placeholder?: string
  minHeight?: number
}

/**
 * The rich-text editor, split out of the route's critical path.
 *
 * TipTap and its ProseMirror dependencies compile to a ~380KB chunk. Imported
 * directly, that chunk landed in the client bundle of every page carrying a
 * compose box — announcements, syllabus, discussions, the assignment forms — so
 * the RSC response for those routes referenced it and the browser had to fetch it
 * before the page painted. Measured at 150ms latency, those hops cost ~840ms
 * against ~230ms for a page with no editor.
 *
 * Behind Suspense, the page paints on the first round trip and the editor swaps
 * in when its chunk lands. The fallback is deliberately a real textarea under the
 * same field name, not a dead skeleton: the form stays readable, focusable and
 * submittable in the gap.
 */
export function RichTextField({ name, defaultHTML = '', placeholder, minHeight = 120 }: Props) {
  return (
    <Suspense
      fallback={
        <textarea
          name={name}
          className="lms-textarea"
          defaultValue={stripTags(defaultHTML)}
          placeholder={placeholder}
          style={{ minHeight: minHeight + 40 }}
          aria-label={placeholder ?? 'Content'}
        />
      }
    >
      <Editor name={name} defaultHTML={defaultHTML} placeholder={placeholder} minHeight={minHeight} />
    </Suspense>
  )
}

/**
 * The fallback is a plain textarea, so existing HTML content has to come through
 * as text. Kept deliberately crude — it's only on screen for one chunk fetch, and
 * anything the user types is replaced by the editor's value once it mounts.
 */
function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}
