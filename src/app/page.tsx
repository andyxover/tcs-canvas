import { redirect } from 'next/navigation'

/**
 * The app lives under /lms; the root just forwards there.
 *
 * In the portal this file goes away — tcs-lms already has its own root — and
 * /lms simply becomes one more section of the site.
 */
export default function RootPage() {
  redirect('/lms')
}
