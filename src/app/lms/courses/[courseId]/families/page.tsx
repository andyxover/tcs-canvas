import { notFound } from 'next/navigation'
import { listRoster, listGuardians, wardsOf } from '@/lib/store'
import { gatherFamilyDigest } from '@/lib/digest'
import { languageLabel, isLanguage } from '@/lib/scaffolding'
import { courseCtx } from '../_shared'
import { DigestView } from '../../../family/DigestView'
import { Avatar, Badge, EmptyState } from '../../../../_components/ui'

export const dynamic = 'force-dynamic'

/**
 * What each family sees, for the teacher who is accountable for it.
 *
 * Rendered from the same DigestView component the guardian gets, so "this is
 * what they see" is structurally true rather than a promise. Without this page
 * the school would be sending families summaries no member of staff had ever
 * read, which is not a thing a school should do — and is the specific failure
 * that makes automated parent communication go wrong.
 */
export default async function FamiliesPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { course, isTeacher } = await courseCtx(params)
  if (!isTeacher) notFound()

  const roster = await listRoster(course.id)
  const guardians = await listGuardians()

  // Guardianships are stored guardian-first, so invert once rather than
  // scanning per student.
  const byStudent = new Map<string, { name: string; relation: string; language: string }[]>()
  for (const g of guardians) {
    for (const w of await wardsOf(g.id)) {
      const list = byStudent.get(w.student.id) ?? []
      list.push({ name: g.name, relation: w.relation, language: w.language })
      byStudent.set(w.student.id, list)
    }
  }

  const rows = await Promise.all(
    roster.map(async (student) => {
      const linked = byStudent.get(student.id) ?? []
      const digest = await gatherFamilyDigest(
        student.id,
        { name: linked[0]?.name ?? '', relation: linked[0]?.relation ?? '', language: linked[0]?.language ?? 'en' },
        [course.id],
      )
      return { student, linked, digest }
    }),
  )

  return (
    <div className="lms-stack">
      <header>
        <h1 className="lms-h1">What families see</h1>
        <p className="lms-sub" style={{ marginBottom: 0, maxWidth: '68ch' }}>
          The same view a guardian gets for {course.name}, from the same component. Nothing reaches a family that is not
          on this page.
        </p>
      </header>

      {rows.every((r) => r.linked.length === 0) ? (
        <EmptyState
          icon="☺"
          title="No guardians linked to this class"
          hint="Guardian accounts are linked by the school office."
        />
      ) : (
        rows.map(({ student, linked, digest }) => (
          <section key={student.id} className="lms-stack" style={{ gap: 8 }}>
            <div className="lms-flex lms-wrap lms-gap-sm" style={{ alignItems: 'center' }}>
              <Avatar person={student} size={30} />
              <strong style={{ fontSize: 15 }}>{student.name}</strong>
              {linked.length === 0 ? (
                <Badge tone="muted">No guardian linked</Badge>
              ) : (
                linked.map((g) => (
                  <Badge key={g.name} tone="info">
                    {g.name} · {g.relation}
                    {/* Which language this family reads is the single most
                        useful thing here for a teacher about to phone home. */}
                    {isLanguage(g.language) && ` · reads ${languageLabel(g.language)}`}
                  </Badge>
                ))
              )}
            </div>
            {digest?.courses[0] && <DigestView digest={digest.courses[0]} />}
          </section>
        ))
      )}
    </div>
  )
}
