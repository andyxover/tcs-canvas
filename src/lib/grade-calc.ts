// Grade calculation for the LMS sandbox — the single source of truth for how
// per-assignment scores roll up into a course total. Every screen (gradebook,
// student grades, dashboard) computes through here so nothing disagrees.

import type { Assignment, GradeSettings, Submission } from './types'

export interface ScoredItem {
  assignment: Assignment
  /** null = not yet graded (excluded from the average). */
  score: number | null
}

export interface CategoryResult {
  name: string
  weight: number
  earned: number
  possible: number
  /** Percentage for the category, or null when nothing is graded yet. */
  pct: number | null
}

export interface CourseGrade {
  /** 0–100, or null when nothing graded / no gradeable work. */
  pct: number | null
  letter: string | null
  categories: CategoryResult[]
}

const LETTER_BANDS: ReadonlyArray<readonly [number, string]> = [
  [97, 'A+'],
  [93, 'A'],
  [90, 'A-'],
  [87, 'B+'],
  [83, 'B'],
  [80, 'B-'],
  [77, 'C+'],
  [73, 'C'],
  [70, 'C-'],
  [67, 'D+'],
  [63, 'D'],
  [60, 'D-'],
  [0, 'F'],
]

export function letterForPct(pct: number | null): string | null {
  if (pct == null) return null
  for (const [min, letter] of LETTER_BANDS) {
    if (pct >= min) return letter
  }
  return 'F'
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Roll graded items up into a course grade, honoring the course's calc mode.
 * Ungraded items are ignored (Canvas-style "based on graded work" behavior).
 */
export function computeCourseGrade(items: ScoredItem[], settings: GradeSettings): CourseGrade {
  const graded = items.filter((i) => i.score != null)

  // Group earned/possible points by category name.
  const byCategory = new Map<string, { earned: number; possible: number }>()
  for (const item of graded) {
    const bucket = byCategory.get(item.assignment.category) ?? { earned: 0, possible: 0 }
    bucket.earned += item.score as number
    bucket.possible += item.assignment.points
    byCategory.set(item.assignment.category, bucket)
  }

  const categories: CategoryResult[] = settings.categories.map((cat) => {
    const bucket = byCategory.get(cat.name) ?? { earned: 0, possible: 0 }
    const pct = bucket.possible > 0 ? round((bucket.earned / bucket.possible) * 100) : null
    return { name: cat.name, weight: cat.weight, earned: bucket.earned, possible: bucket.possible, pct }
  })

  if (settings.calc === 'none') {
    return { pct: null, letter: null, categories }
  }

  if (settings.calc === 'total') {
    const earned = graded.reduce((n, i) => n + (i.score as number), 0)
    const possible = graded.reduce((n, i) => n + i.assignment.points, 0)
    const pct = possible > 0 ? round((earned / possible) * 100) : null
    return { pct, letter: letterForPct(pct), categories }
  }

  // Weighted: renormalize over categories that actually have graded work, so an
  // empty category early in the term doesn't drag the total to zero.
  const active = categories.filter((c) => c.pct != null && c.weight > 0)
  const totalWeight = active.reduce((n, c) => n + c.weight, 0)
  if (totalWeight === 0) {
    return { pct: null, letter: null, categories }
  }
  const weighted = active.reduce((n, c) => n + (c.pct as number) * (c.weight / totalWeight), 0)
  const pct = round(weighted)
  return { pct, letter: letterForPct(pct), categories }
}

/** A submission is late when it was turned in after the assignment's due date. */
export function isLate(assignment: Assignment, submission: Submission | undefined): boolean {
  if (!submission || !submission.submittedAt || !assignment.dueAt) return false
  return new Date(submission.submittedAt).getTime() > new Date(assignment.dueAt).getTime()
}

/** Missing = past due, published, and nothing turned in. */
export function isMissing(assignment: Assignment, submission: Submission | undefined): boolean {
  if (!assignment.published || !assignment.dueAt) return false
  const turnedIn = submission && submission.state !== 'unsubmitted'
  return !turnedIn && new Date(assignment.dueAt).getTime() < Date.now()
}
