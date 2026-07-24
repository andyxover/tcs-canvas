'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = {
  courseId: string
  courseName: string
  courseCode: string
  term: string
  isTeacher: boolean
}

const ITEMS = [
  { seg: '', label: 'Home', icon: '⌂', teacherOnly: false },
  { seg: 'announcements', label: 'Announcements', icon: '📣', teacherOnly: false },
  { seg: 'modules', label: 'Modules', icon: '▤', teacherOnly: false },
  { seg: 'assignments', label: 'Assignments', icon: '✎', teacherOnly: false },
  { seg: 'grades', label: 'Grades', icon: '◈', teacherOnly: false },
  { seg: 'standards', label: 'Standards', icon: '◆', teacherOnly: false },
  { seg: 'discussions', label: 'Discussions', icon: '💬', teacherOnly: false },
  { seg: 'people', label: 'People', icon: '☺', teacherOnly: false },
  { seg: 'syllabus', label: 'Syllabus', icon: '❋', teacherOnly: false },
  { seg: 'settings', label: 'Settings', icon: '⚙', teacherOnly: true },
] as const

export function CourseNav({ courseId, courseName, courseCode, term, isTeacher }: Props) {
  const pathname = usePathname()
  const base = `/courses/${courseId}`
  const items = ITEMS.filter((item) => !item.teacherOnly || isTeacher)

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
          <Link key={item.label} href={href} className="lms-navlink" data-active={isActive(item.seg)}>
            <span aria-hidden style={{ width: 18, textAlign: 'center' }}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
