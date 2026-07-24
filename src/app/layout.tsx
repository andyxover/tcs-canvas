import type { Metadata } from 'next'
import { getViewer } from '@/lib/session'
import { listStudents, listTeachers } from '@/lib/store'
import { TopBar } from './_components/TopBar'
import './globals.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'TCS Canvas',
  description: 'A Canvas-structured learning management system for TCS.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer()
  return (
    <html lang="en">
      <body>
        <div className="lms">
          <TopBar viewer={viewer} teachers={listTeachers()} students={listStudents()} />
          {children}
        </div>
      </body>
    </html>
  )
}
