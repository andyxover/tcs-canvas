import { getViewer } from '@/lib/session'
import { listStudents, listTeachers } from '@/lib/store'
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
      <TopBar viewer={viewer} teachers={await listTeachers()} students={await listStudents()} />
      {children}
    </div>
  )
}
