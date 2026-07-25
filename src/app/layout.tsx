import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Source_Serif_4 } from 'next/font/google'
import { getViewer } from '@/lib/session'
import { listStudents, listTeachers } from '@/lib/store'
import { TopBar } from './_components/TopBar'
import './globals.css'

/**
 * Two families, both variable so each is a single self-hosted file that next/font
 * preloads — no external request, no layout shift from a late swap.
 *
 * Source Serif carries the titles. A school running the BC curriculum should read
 * like a piece of academic publishing, not a SaaS dashboard, and a serif at
 * display size does that in a way no amount of extra chrome will. Jakarta Sans
 * takes the interface text: humanist enough to have a voice, plain enough to
 * disappear at 13px in a gradebook.
 */
const display = Source_Serif_4({
  subsets: ['latin'],
  variable: '--lms-font-display',
  display: 'swap',
  axes: ['opsz'],
})

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--lms-font-sans',
  display: 'swap',
})

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'TCS Canvas',
  description: 'A Canvas-structured learning management system for TCS.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer()
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable}`}>
      <body>
        {/* Apply the saved theme before paint so there's no flash of light mode. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{if(localStorage.getItem('tcs-canvas-theme')==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();",
          }}
        />
        <div className="lms">
          <TopBar viewer={viewer} teachers={listTeachers()} students={listStudents()} />
          {children}
        </div>
      </body>
    </html>
  )
}
