import { dashboardRepository } from '~~/server/repositories/dashboardRepository'
import { karachiNow, mondayOfThisWeek } from '~~/server/utils/karachiDate'

// builds the digest content for the signed in user only, so the profile
// page can render it as a live preview.
//
// developer only feature: QA Lead, Tester, and Admin accounts get
// nothing from this endpoint (403 below), not just a hidden section on
// the profile page. a developer picks a day/week period and sees the
// bugs on their plate that had activity in it (assigned, status
// changed, resolved, whatever) with their current status, nothing else.
// the bug list uses cursor pagination rather than offset/limit -- see
// getDeveloperBugsForPeriod for why.
//
// karachiNow/mondayOfThisWeek live in server/utils/karachiDate.ts and
// are shared with the developer bugs directory's period filter, so both
// pages agree on where a day/week starts.

function parseCursor(query: Record<string, unknown>): { lastStatusChangeAt: string; id: number } | null {
  const ts = query.cursorTs
  const id = query.cursorId
  if (typeof ts !== 'string' || !ts) return null
  const parsedId = Number(id)
  if (!Number.isFinite(parsedId)) return null
  return { lastStatusChangeAt: ts, id: parsedId }
}

function formatBugRows(bugs: { id: number; title: string; severity: string; status: string }[]) {
  return bugs.map((b) => ({
    id: b.id,
    code: `BUG-${String(b.id).padStart(3, '0')}`,
    title: b.title,
    severity: b.severity,
    status: b.status
  }))
}

export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser

  // the digest (this live preview, and the emailed version) is a
  // Developer only feature. QA Lead, Tester, and Admin accounts get
  // nothing here, not just a hidden section on the page
  if (currentUser.role !== 'Developer') {
    throw createError({ statusCode: 403, statusMessage: 'Digest is only available to Developer accounts' })
  }

  const query = getQuery(event)

  const range = query.range === 'week' ? 'week' : 'day'
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 200)
  const bugsOnly = query.bugsOnly === 'true'
  const cursor = parseCursor(query)

  const now = karachiNow()
  const today = now.toISOString().slice(0, 10)
  const weekStart = mondayOfThisWeek(now)

  const periodStart = range === 'week' ? weekStart : today
  const periodEnd = today

  // scrolling further down the bug list only ever needs more bug
  // rows for the same period
  if (bugsOnly) {
    const { bugs, totalCount } = await dashboardRepository.getDeveloperBugsForPeriod(
      currentUser.id,
      periodStart,
      periodEnd,
      limit,
      cursor
    )
    const last = bugs[bugs.length - 1]
    return {
      bugs: formatBugRows(bugs),
      bugsLimit: limit,
      bugsTotalCount: totalCount,
      bugsHasMore: bugs.length === limit,
      nextCursor: last ? { lastStatusChangeAt: last.last_status_change_at, id: last.id } : null
    }
  }

  const { bugs, totalCount } = await dashboardRepository.getDeveloperBugsForPeriod(
    currentUser.id,
    periodStart,
    periodEnd,
    limit,
    cursor
  )
  const last = bugs[bugs.length - 1]

  return {
    scope: 'developer' as const,
    range,
    weekStart,
    weekEnd: today,
    bugs: formatBugRows(bugs),
    bugsLimit: limit,
    bugsTotalCount: totalCount,
    bugsHasMore: bugs.length === limit,
    nextCursor: last ? { lastStatusChangeAt: last.last_status_change_at, id: last.id } : null
  }
})