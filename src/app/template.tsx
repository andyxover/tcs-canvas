/**
 * Deliberately carries no animation of its own.
 *
 * Templates remount on every navigation, which is the useful part here: it
 * guarantees the subtree below is a *fresh* DOM node, so the CSS enter animation
 * on `.lms-page` replays on every route change instead of being skipped when
 * React would otherwise reuse a same-typed element in the same position.
 *
 * The animation itself lives further down — on `.lms-page` for top-level routes,
 * and in courses/[courseId]/template.tsx for course tabs — so the top bar and the
 * course rail never move. Animating from here dragged the entire chrome along on
 * every tab change, which is what made navigation feel unsteady.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return children
}
