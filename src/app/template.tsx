/**
 * Templates remount on every navigation (layouts don't), which is what makes the
 * enter animation replay per route change instead of only on first paint. It sits
 * below the TopBar in the layout, so the chrome stays put while the page content
 * animates in.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="lms-view">{children}</div>
}
