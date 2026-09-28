import { dashboardRepository } from '~~/server/repositories/dashboardRepository'

const RANGE_DAYS: Record<string, number | null> = {
  '7d': 7,
  '14d': 14,
  '30d': 30,
  all: null
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// resolves a preset key into an inclusive [start, end] date-only range.
// "all" has no lower bound in practice, so it uses a floor date far
// enough back to include everything this pilot could plausibly have.
function resolveRange(rangeKey: string): { start: string; end: string } {
  const today = new Date()
  const end = toDateOnly(today)
  const days = RANGE_DAYS[rangeKey]

  if (days === null) {
    return { start: '2000-01-01', end }
  }

  const start = new Date(today)
  start.setDate(start.getDate() - (days - 1))
  return { start: toDateOnly(start), end }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const rangeKey = typeof query.range === 'string' && query.range in RANGE_DAYS ? query.range : '7d'
  const moduleId = query.moduleId ? Number(query.moduleId) : null
  const releaseId = query.releaseId ? Number(query.releaseId) : null

  const { start, end } = resolveRange(rangeKey)

  const [snapshot, passRate, trend, bugBreakdown, requirementsBreakdown, criticalBugs, recentExecutions] =
    await Promise.all([
      dashboardRepository.getSnapshotMetrics(moduleId, releaseId),
      dashboardRepository.getPassRate(start, end, moduleId, releaseId),
      dashboardRepository.getExecutionTrend(start, end, moduleId, releaseId),
      dashboardRepository.getBugBreakdown(moduleId, releaseId),
      dashboardRepository.getRequirementsStatusBreakdown(moduleId),
      dashboardRepository.getCriticalBugsWatchlist(moduleId, releaseId),
      dashboardRepository.getRecentExecutions(moduleId, releaseId)
    ])

  return {
    range: { key: rangeKey, start, end },
    snapshot,
    passRate,
    trend,
    bugBreakdown,
    requirementsBreakdown,
    criticalBugs,
    recentExecutions
  }
})
