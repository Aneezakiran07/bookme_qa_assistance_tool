import { dashboardRepository } from '~~/server/repositories/dashboardRepository'
import { karachiNow, mondayOfThisWeek } from '~~/server/utils/karachiDate'

// builds the digest content for the signed in user only, so the profile
// page can render it as a live preview.
//
// developers get a day/week toggle, same shape as leads: pick a period
// and see the bugs on their plate that actually had activity in it
// (assigned, status changed, resolved, whatever) with their current
// status, nothing else. the bug list uses cursor pagination rather than
// offset/limit -- see getDeveloperBugsForPeriod for why.
//
// qa leads, admins, and testers don't own bugs the same way, so they
// get a lighter project wide view instead: open bug counts plus a pass
// rate, and for them the range query param switches between today's
// numbers and this week's.
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

export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser
  const query = getQuery(event)

  const range = query.range === 'week' ? 'week' : 'day'
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 200)
  const bugsOnly = query.bugsOnly === 'true'
  const cursor = parseCursor(query)

  const now = karachiNow()
  const today = now.toISOString().slice(0, 10)
  const weekStart = mondayOfThisWeek(now)

  if (currentUser.role === 'Developer') {
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
        bugs: bugs.map((b) => ({
          id: b.id,
          code: `BUG-${String(b.id).padStart(3, '0')}`,
          title: b.title,
          severity: b.severity,
          status: b.status
        })),
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
      bugs: bugs.map((b) => ({
        id: b.id,
        code: `BUG-${String(b.id).padStart(3, '0')}`,
        title: b.title,
        severity: b.severity,
        status: b.status
      })),
      bugsLimit: limit,
      bugsTotalCount: totalCount,
      bugsHasMore: bugs.length === limit,
      nextCursor: last ? { lastStatusChangeAt: last.last_status_change_at, id: last.id } : null
    }
  }

  const metrics = await dashboardRepository.getSnapshotMetrics(null, null)

  if (range === 'day') {
    const passRateDay = await dashboardRepository.getPassRate(today, today, null, null)
    return {
      scope: 'lead' as const,
      range,
      openBugs: metrics.open_bugs,
      openCriticalHigh: metrics.open_critical_high,
      passRate: passRateDay.pass_rate,
      passedExecutions: passRateDay.passed_executions,
      totalExecutions: passRateDay.total_executions
    }
  }

  const passRateWeek = await dashboardRepository.getPassRate(weekStart, today, null, null)
  return {
    scope: 'lead' as const,
    range,
    openBugs: metrics.open_bugs,
    openCriticalHigh: metrics.open_critical_high,
    weekStart,
    weekEnd: today,
    passRate: passRateWeek.pass_rate,
    passedExecutions: passRateWeek.passed_executions,
    totalExecutions: passRateWeek.total_executions
  }
})
