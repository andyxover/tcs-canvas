'use client'

import { usePathname } from 'next/navigation'
import { HoverLink } from '../../../../_components/interactive'

type Props = {
  courseId: string
  courseName: string
  courseCode: string
  term: string
  isTeacher: boolean
}

// `audience` rather than a pair of booleans: the two are mutually exclusive, and
// a nav item that is somehow both teacherOnly and studentOnly should not be
// expressible.
const ITEMS = [
  { seg: '', label: 'Home', icon: '⌂', audience: 'all' },
  { seg: 'announcements', label: 'Announcements', icon: '📣', audience: 'all' },
  { seg: 'modules', label: 'Modules', icon: '▤', audience: 'all' },
  { seg: 'assignments', label: 'Assignments', icon: '✎', audience: 'all' },
  { seg: 'grades', label: 'Grades', icon: '◈', audience: 'all' },
  { seg: 'standards', label: 'Standards', icon: '◆', audience: 'all' },
  { seg: 'practice', label: 'Practice', icon: '◎', audience: 'student' },
  { seg: 'discussions', label: 'Discussions', icon: '💬', audience: 'all' },
  { seg: 'people', label: 'People', icon: '☺', audience: 'all' },
  { seg: 'syllabus', label: 'Syllabus', icon: '❋', audience: 'all' },
  { seg: 'reports', label: 'Reports', icon: '✍', audience: 'teacher' },
  { seg: 'settings', label: 'Settings', icon: '⚙', audience: 'teacher' },
] as const

export function CourseNav({ courseId, courseName, courseCode, term, isTeacher }: Props) {
  const pathname = usePathname()
  const base = `/lms/courses/${courseId}`
  const items = ITEMS.filter(
    (item) => item.audience === 'all' || (item.audience === 'teacher') === isTeacher,
  )

  function isActive(seg: string): boolean {
    const href = seg ? `${base}/${seg}` : base
    if (seg === '') return pathname === base
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <nav className="lms-coursenav" aria-label={`${courseName} navigation`}>
      <div className="lms-coursenav__title">
        {courseCode}
        <span className="lms-coursenav__term">{term}</span>
      </div>
      {items.map((item) => {
        const href = item.seg ? `${base}/${item.seg}` : base
        return (
          <HoverLink key={item.label} href={href} className="lms-navlink" data-active={isActive(item.seg)}>
            <span aria-hidden style={{ width: 18, textAlign: 'center' }}>
              {item.icon}
            </span>
            {item.label}
          </HoverLink>
        )
      })}
    </nav>
  )
}
