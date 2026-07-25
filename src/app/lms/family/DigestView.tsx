import Link from 'next/link'
import type { CourseDigest } from '@/lib/digest'
import { levelWord } from '@/lib/digest'
import { Badge } from '../../_components/ui'

/**
 * One course, as a family sees it.
 *
 * The order on the page is the argument: what the child can now do, then what is
 * next, then what is outstanding, and only then the mark. A percentage at the
 * top would be read first and remembered instead of everything under it, which
 * is precisely the conversation this is meant to replace.
 *
 * Rendered identically for the guardian and for the teacher, from one component,
 * so "what the family sees" is not a claim anyone has to take on trust.
 */
export function DigestView({ digest, courseHref }: { digest: CourseDigest; courseHref?: string }) {
  return (
    <article className="lms-card lms-card--pad lms-stack" style={{ gap: 14 }}>
      <div className="lms-between lms-wrap" style={{ gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 17 }}>
          {courseHref ? <Link href={courseHref}>{digest.courseName}</Link> : digest.courseName}
        </h3>
        {digest.work.missing > 0 && (
          <Badge tone="warn">
            {digest.work.missing} outstanding
          </Badge>
        )}
      </div>

      {digest.canNowDo.length > 0 ? (
        <section>
          <Heading>What {digest.courseName.split(' ')[0]} work shows they can do</Heading>
          <ul className="lms-digest__list">
            {digest.canNowDo.map((s) => (
              <li key={s.code}>
                <div>{s.text}</div>
                <div className="lms-muted" style={{ fontSize: 12, marginTop: 2 }}>
                  <code className="lms-stdpick__code">{s.code}</code> · {levelWord(s.level)}
                  {/* The piece of work is what turns this from an assertion into
                      something a family can ask their child about. */}
                  {s.evidencedIn && ` · shown in ${s.evidencedIn}`}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="lms-muted" style={{ fontSize: 13.5 }}>
          Nothing has yet been assessed at Proficient or above in this course.
        </div>
      )}

      {digest.workingOn.length > 0 && (
        <section>
          <Heading>Being worked on next</Heading>
          <ul className="lms-digest__list">
            {digest.workingOn.map((s) => (
              <li key={s.code}>
                <div>{s.text}</div>
                <div className="lms-muted" style={{ fontSize: 12, marginTop: 2 }}>
                  <code className="lms-stdpick__code">{s.code}</code> · {levelWord(s.level)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {digest.outstanding.length > 0 && (
        <section>
          <Heading>Not handed in</Heading>
          <ul className="lms-digest__list">
            {digest.outstanding.map((o) => (
              <li key={o.title}>{o.title}</li>
            ))}
          </ul>
        </section>
      )}

      {digest.comingUp.length > 0 && (
        <section>
          <Heading>Due in the next two weeks</Heading>
          <ul className="lms-digest__list">
            {digest.comingUp.map((o) => (
              <li key={o.title}>{o.title}</li>
            ))}
          </ul>
        </section>
      )}

      {digest.teacherFeedback.length > 0 && (
        <section>
          <Heading>From their teacher</Heading>
          <div className="lms-stack" style={{ gap: 6, marginTop: 6 }}>
            {digest.teacherFeedback.map((f, i) => (
              <div key={i} style={{ fontSize: 13.5, lineHeight: 1.65 }}>
                <span className="lms-muted">{f.assignmentTitle}: </span>
                {f.feedback}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="lms-muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
        {digest.notAssessedCount > 0 && (
          <>
            {digest.notAssessedCount} of this course’s learning standards have not been assessed yet, so this update
            cannot speak to them.{' '}
          </>
        )}
        {digest.work.submitted} of {digest.work.assigned} pieces of work handed in
        {digest.work.late > 0 && `, ${digest.work.late} after the due date`}.
        {/* Last, deliberately, and only where BC actually reports one. */}
        {digest.standing && (digest.standing.letter || digest.standing.percent != null) && (
          <>
            {' '}
            Current standing: {digest.standing.letter ?? '—'}
            {digest.standing.percent != null && ` (${digest.standing.percent}%)`}.
          </>
        )}
      </div>
    </article>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <div className="lms-muted" style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.05em' }}>
      {children}
    </div>
  )
}
