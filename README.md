# TCS Canvas

A **Canvas-structured learning management system** for TCS — courses,
assignments, student submissions, a weighted gradebook, modules, discussions,
people, and syllabus. Built as a standalone app so the teaching-&-learning
experience can be designed and refined independently, with zero coupling to the
main TCS portal.

## Status: sandbox

This runs entirely on **seeded, in-memory data** with a "view as
teacher/student" role switcher — no database, no authentication, no external
services. It's a UX and feature playground. State resets when the dev server
restarts. The single seam to make it real later is `src/lib/store.ts` (swap the
in-memory functions for a real backend and the UI is unchanged).

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000
```

Use the **top-right menu** to view the whole app as any teacher or student.

### Try the core loop

1. As a **student**, open a course → **Assignments** → pick one that's still
   open → type a response, add a file name, **Turn in**.
2. Switch to the **teacher** (top-right) → open that assignment →
   **Grade submissions** → enter a score + feedback → **Save**.
3. Switch back to the **student** → you'll see the grade and feedback, and the
   weighted course total updates in **Grades**.

## What's inside

| Area | Route |
|------|-------|
| Dashboard (courses) | `/` |
| Course home | `/courses/[id]` |
| Announcements | `/courses/[id]/announcements` |
| Modules (+ content pages) | `/courses/[id]/modules` |
| Assignments (list / detail / create / grade) | `/courses/[id]/assignments` |
| Gradebook (teacher grid + student view) | `/courses/[id]/grades` |
| Discussions (threaded) | `/courses/[id]/discussions` |
| People | `/courses/[id]/people` |
| Syllabus | `/courses/[id]/syllabus` |

## Architecture

- **Next.js 16** (App Router) + **React 19** + **TypeScript**. No Tailwind — a
  single scoped stylesheet (`src/app/globals.css`) all under a `.lms` root.
- **`src/lib/`** — the self-contained domain: `types`, `seed` (the mock
  school), `store` (in-memory data access + mutations), `session` (cookie role
  switcher), `grade-calc` (the one weighted/total grade calculator used
  everywhere).
- **`src/app/`** — the routes and UI. Server Components for reads, Server
  Actions for writes.

## Tech notes

- Grades never double-count: per-assignment scores roll up through
  `grade-calc.ts` into a course total; ungraded work is excluded (Canvas-style
  "based on graded work").
- Rich text (instructions, announcements, syllabus) is currently trusted
  sandbox HTML. Before real users author content, swap `RichText` for a
  sanitizing renderer.
