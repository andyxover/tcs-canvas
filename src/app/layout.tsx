import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Source_Serif_4 } from 'next/font/google'
import './globals.css'

/**
 * Document shell only.
 *
 * Everything that makes this the LMS — the `.lms` scope, the top bar, the viewer
 * — lives in app/lms/layout.tsx instead. That split is what lets the whole thing
 * drop into the portal as a route group: over there this file doesn't exist,
 * the portal owns <html>/<body>, and app/lms/layout.tsx nests underneath it
 * unchanged.
 *
 * Two font families, both variable so each is a single self-hosted file that
 * next/font preloads — no external request, no shift from a late swap. Source
 * Serif carries the titles: a school running the BC curriculum should read like
 * academic publishing, not a SaaS dashboard. Jakarta Sans takes interface text —
 * humanist enough to have a voice, plain enough to disappear at 13px in a
 * gradebook.
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

export const metadata: Metadata = {
  title: 'TCS Canvas',
  description: 'A Canvas-structured learning management system for TCS.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        {children}
      </body>
    </html>
  )
}
