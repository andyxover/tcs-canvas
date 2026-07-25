import { getViewer } from '@/lib/session'
import { listGuardians, listStudents, listTeachers } from '@/lib/store'
import { TopBar } from '../_components/TopBar'

/**
 * The LMS shell: the `.lms` style scope, the top bar, and the resolved viewer.
 *
 * Everything the app needs lives at or below this segment, which is the point.
 * tcs-lms already owns `(app)/courses`, so the sandbox could never sit at the
 * root over there; mounting it under /lms means the port is a directory move
 * rather than a rename pass across every Link, redirect and router.push.
 *
 * In the portal this file keeps its shape — only `getViewer` changes, from the
 * cookie switcher to real auth.
 */
export const dynamic = 'force-dynamic'

export default async function LmsLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer()
  return (
    <div className="lms">
      {/* The switcher receives every teacher, student and guardian because
          "view as anyone" is what makes this a sandbox. It is also the one thing
          here with no place in production: behind real auth there is no
          switcher, and no page should ship a roster to a client that cannot act
          on it. */}
      <TopBar
        viewer={viewer}
        teachers={await listTeachers()}
        students={await listStudents()}
        guardians={await listGuardians()}
      />
      {children}
    </div>
  )
}
