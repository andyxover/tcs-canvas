/**
 * Animates only the course content column.
 *
 * This sits inside the course layout, below `.lms-content`, so switching tabs
 * fades and lifts the page body while the course rail and the top bar hold
 * perfectly still. Being a template, it remounts per navigation, so the
 * animation replays on every tab change rather than only the first.
 */
export default function CourseTemplate({ children }: { children: React.ReactNode }) {
  return <div className="lms-view">{children}</div>
}
