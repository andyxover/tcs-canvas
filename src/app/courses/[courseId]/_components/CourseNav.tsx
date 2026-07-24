'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = {
  courseId: string
  courseName: string
  courseCode: string
  term: string
}

const ITEMS = [
  { seg: '', label: 'Home', icon: '⌂' },
  { seg: 'announcements', label: 'Announcements', icon: '📣' },
  { seg: 'modules', label: 'Modules', icon: '▤' },
  { seg: 'assignments', label: 'Assignments', icon: '✎' },
  { seg: 'grades', label: 'Grades', icon: '◈' },
  { seg: 'discussions', label: 'Discussions', icon: '💬' },
  { seg: 'people', label: 'People', icon: '☺' },
  { seg: 'syllabus', label: 'Syllabus', icon: '❋' },
] as const

export function CourseNav({ courseId, courseName, courseCode, term }: Props) {
  const pathname = usePathname()
  const base = `/courses/${courseId}`

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
      {ITEMS.map((item) => {
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
