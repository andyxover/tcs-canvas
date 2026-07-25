import { createMcpHandler } from 'mcp-handler'
import { z } from 'zod'
import { mcpEnabled, resolveCaller, type McpCaller } from '@/lib/mcp/auth'
import {
  ToolError,
  draftAssignment,
  gradingQueue,
  listCourseRoster,
  listCourseStandards,
  listMyCourses,
  missingWork,
  studentStanding,
  whoHasNotDemonstrated,
} from '@/lib/mcp/tools'

/**
 * The LMS as an MCP server, at /api/mcp.
 *
 * Mounted under /api rather than at the root: `[transport]` is a catch-all
 * segment, and at the root it would shadow every page in the app.
 *
 * The handler is rebuilt per request because the tools close over the calling
 * teacher, which is resolved from the bearer token. That is the point — a tool
 * cannot be handed a teacher id, so it cannot be pointed at someone else's class.
 */

export const dynamic = 'force-dynamic'

function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

/** Tool failures are answers, not crashes — the model should read and retry. */
async function run(fn: () => Promise<unknown>) {
  try {
    return ok(await fn())
  } catch (err) {
    if (err instanceof ToolError) {
      return { content: [{ type: 'text' as const, text: err.message }], isError: true }
    }
    console.error('[mcp] tool failed:', err)
    return { content: [{ type: 'text' as const, text: 'That request failed.' }], isError: true }
  }
}

function handlerFor(caller: McpCaller) {
  const me = caller.teacherId
  return createMcpHandler(
    (server) => {
      server.tool(
        'list_my_courses',
        'List the courses you teach this term, with roster sizes and which BC curriculum each draws on.',
        {},
        () => run(() => listMyCourses(me)),
      )

      server.tool(
        'list_roster',
        'List the students enrolled in one of your courses.',
        { courseId: z.string().describe('Course id from list_my_courses.') },
        ({ courseId }) => run(() => listCourseRoster(me, courseId)),
      )

      server.tool(
        'list_course_standards',
        'List the BC learning standards attached to work in one of your courses, with their codes.',
        { courseId: z.string().describe('Course id from list_my_courses.') },
        ({ courseId }) => run(() => listCourseStandards(me, courseId)),
      )

      server.tool(
        'who_has_not_demonstrated',
        'For one BC learning standard, split the class into those who have demonstrated it ' +
          '(Proficient or Extending), those assessed but not there yet, and those never assessed on it. ' +
          'Never-assessed students are not behind — nothing has measured it for them.',
        {
          courseId: z.string().describe('Course id from list_my_courses.'),
          standardCode: z.string().describe('Standard code, e.g. SCI9-CC-3. See list_course_standards.'),
        },
        ({ courseId, standardCode }) => run(() => whoHasNotDemonstrated(me, courseId, standardCode)),
      )

      server.tool(
        'student_standing',
        'One student in one of your courses: standards demonstrated and the work that showed each, ' +
          'standards still developing, how many are unassessed, and their submission record.',
        {
          courseId: z.string().describe('Course id from list_my_courses.'),
          studentId: z.string().describe('Student id from list_roster.'),
        },
        ({ courseId, studentId }) => run(() => studentStanding(me, courseId, studentId)),
      )

      server.tool(
        'grading_queue',
        'How much work is waiting to be graded, per course.',
        {},
        () => run(() => gradingQueue(me)),
      )

      server.tool(
        'missing_work',
        'Which students in a course have work past its due date that was never handed in.',
        { courseId: z.string().describe('Course id from list_my_courses.') },
        ({ courseId }) => run(() => missingWork(me, courseId)),
      )

      server.tool(
        'draft_assignment',
        'Create an UNPUBLISHED assignment in one of your courses, optionally aligned to BC standards. ' +
          'It is a draft: students cannot see it until you publish it yourself. ' +
          'There is deliberately no tool for grading, recording proficiency, or publishing — ' +
          'those are the teacher’s professional judgement and stay in the app.',
        {
          courseId: z.string().describe('Course id from list_my_courses.'),
          title: z.string().min(1).max(200),
          instructions: z.string().min(1).max(4000).describe('Plain text. Rendered as a paragraph.'),
          points: z.number().min(0).max(1000),
          category: z.string().optional().describe('Must match a grade category on the course.'),
          dueAt: z.string().optional().describe('ISO 8601, e.g. 2026-03-14T23:59:00Z.'),
          standardCodes: z.array(z.string()).optional().describe('Standard codes, e.g. ["SCI9-CC-3"].'),
        },
        (args) => run(() => draftAssignment(me, args)),
      )
    },
    {
      serverInfo: { name: 'tcs-learn', version: '0.1.0' },
      instructions:
        'The TCS Learn LMS for the signed-in teacher. It holds BC-curriculum learning standards and a ' +
        'per-student record of which standards each student has demonstrated, evidenced by specific ' +
        'coursework. Start with list_my_courses. This server reads and can draft an unpublished ' +
        'assignment; it cannot grade, assess proficiency, or publish anything to students.',
    },
    { basePath: '/api', maxDuration: 60, verboseLogs: false },
  )
}

async function handle(request: Request) {
  if (!mcpEnabled()) {
    // Off, not open. A server that answers without credentials because none were
    // configured is how a demo endpoint ends up serving real data.
    return Response.json(
      { error: 'MCP is not enabled. Set LMS_MCP_TOKENS to turn it on.' },
      { status: 503 },
    )
  }

  const caller = resolveCaller(request.headers.get('authorization'))
  if (!caller) {
    return Response.json(
      { error: 'A valid bearer token is required.' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="tcs-learn"' } },
    )
  }

  return handlerFor(caller)(request)
}

export { handle as GET, handle as POST, handle as DELETE }
