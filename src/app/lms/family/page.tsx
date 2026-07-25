import { notFound } from 'next/navigation'
import { getViewer } from '@/lib/session'
import { listCoursesForStudent, wardOf, wardsOf } from '@/lib/store'
import { gatherFamilyDigest } from '@/lib/digest'
import { languageLabel, isLanguage } from '@/lib/scaffolding'
import { llmConfigured } from '@/lib/ai/anthropic'
import { DigestView } from './DigestView'
import { WrittenUpdate } from './WrittenUpdate'
import { EmptyState } from '../../_components/ui'
import { HoverLink } from '../../_components/interactive'

export const dynamic = 'force-dynamic'

/**
 * A guardian's whole surface.
 *
 * Guardians get this page and nothing else — no course pages, no gradebook, no
 * roster. That is not a simplification for their benefit; it is the access
 * boundary. Every child shown here comes from `wardsOf`, and the per-child view
 * re-checks `wardOf` rather than trusting the id in the URL.
 */
export default async function FamilyPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>
}) {
  const viewer = await getViewer()
  if (viewer.kind !== 'guardian') notFound()

  const wards = await wardsOf(viewer.person.id)
  if (wards.length === 0) {
    return (
      <main className="lms-page">
        <EmptyState icon="☺" title="No children linked to this account" hint="Ask the school office to link them." />
      </main>
    )
  }

  const { child } = await searchParams
  // An id in the URL is a request, not a permission. Re-checked here, so a
  // guessed or shared link resolves to their own first child rather than
  // somebody else's.
  const requested = child ? await wardOf(viewer.person.id, child) : undefined
  const active = requested ? wards.find((w) => w.student.id === requested.studentId)! : wards[0]
  const link = requested ?? (await wardOf(viewer.person.id, active.student.id))!

  const courses = await listCoursesForStudent(active.student.id)
  const digest = await gatherFamilyDigest(
    active.student.id,
    { name: viewer.person.name, relation: link.relation, language: link.language },
    courses.map((c) => c.id),
  )
  if (!digest) notFound()

  const lang = isLanguage(link.language) ? languageLabel(link.language) : 'English'

  return (
    <main className="lms-page lms-stack">
      <header>
        <h1 className="lms-h1">{active.student.name}</h1>
        <p className="lms-sub" style={{ marginBottom: 0 }}>
          {/* Explicit {' '} because the text after an expression wraps onto the
              next line, and JSX trims each line of a multi-line text node — which
              silently ate the space and rendered "Avacan do". */}
          What {digest.student.firstName}{' '}
          can do so far this term, and what comes next. This is the school&apos;s record — not a summary of it.
        </p>
      </header>

      {wards.length > 1 && (
        <nav className="lms-flex lms-wrap lms-gap-sm" aria-label="Children">
          {wards.map((w) => (
            <HoverLink
              key={w.student.id}
              href={`/lms/family?child=${w.student.id}`}
              className="lms-btn lms-btn--sm"
              data-active={w.student.id === active.student.id}
            >
              {w.student.name}
            </HoverLink>
          ))}
        </nav>
      )}

      {link.language !== 'en' && (
        <WrittenUpdate studentId={active.student.id} language={lang} configured={llmConfigured()} />
      )}

      {digest.thin && (
        <div className="lms-callout">
          Very little has been assessed so far this term, so there is not much here yet. That is normal early on.
        </div>
      )}

      <div className="lms-stack">
        {digest.courses.map((c) => (
          <DigestView key={c.courseId} digest={c} />
        ))}
      </div>

      <p className="lms-muted" style={{ fontSize: 12.5, maxWidth: '68ch', lineHeight: 1.6 }}>
        Learning standards come from the BC curriculum. The proficiency scale runs Emerging, Developing, Proficient,
        Extending — Proficient means your child consistently demonstrates what is expected at this grade. Marks and
        percentages are only reported in Grades 10–12.
      </p>
    </main>
  )
}
