import { dashboardRepository } from '~~/server/repositories/dashboardRepository'
import { requireProject } from '~~/server/utils/requireProject'

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
  start.setDate(start.getDate() - ((days ?? 30) - 1))
  return { start: toDateOnly(start), end }
}

// the dashboard numbers are counted live but the result is kept for a short
// time so many people opening the dashboard at once share one set of queries
// the key holds every input that changes the result, including the project and the date range
// so a new day never reuses yesterday's numbers, and swr is off so nothing
// older than the max age is ever served
const DASHBOARD_CACHE_SECONDS = 30

const getDashboardData = defineCachedFunction(
  async (
    projectId: number,
    _rangeKey: string,
    start: string,
    end: string,
    moduleId: number | null,
    releaseId: number | null
  ) => {
    const [snapshot, passRate, trend, bugBreakdown, requirementsBreakdown, criticalBugs, recentExecutions] =
      await Promise.all([
        dashboardRepository.getSnapshotMetrics(projectId, moduleId, releaseId),
        dashboardRepository.getPassRate(projectId, start, end, moduleId, releaseId),
        dashboardRepository.getExecutionTrend(projectId, start, end, moduleId, releaseId),
        dashboardRepository.getBugBreakdown(projectId, moduleId, releaseId),
        dashboardRepository.getRequirementsStatusBreakdown(projectId, moduleId),
        dashboardRepository.getCriticalBugsWatchlist(projectId, moduleId, releaseId),
        dashboardRepository.getRecentExecutions(projectId, moduleId, releaseId)
      ])

    return { snapshot, passRate, trend, bugBreakdown, requirementsBreakdown, criticalBugs, recentExecutions }
  },
  {
    name: 'dashboard-metrics',
    maxAge: DASHBOARD_CACHE_SECONDS,
    swr: false,
    getKey: (projectId, rangeKey, start, end, moduleId, releaseId) =>
      `${projectId}:${rangeKey}:${start}:${end}:${moduleId ?? 'all'}:${releaseId ?? 'all'}`
  }
)

export default defineEventHandler(async (event) => {
  const project = await requireProject(event)
  const query = getQuery(event)

  const rangeKey = typeof query.range === 'string' && query.range in RANGE_DAYS ? query.range : '7d'
  const moduleId = query.moduleId ? Number(query.moduleId) : null
  const releaseId = query.releaseId ? Number(query.releaseId) : null

  const { start, end } = resolveRange(rangeKey)

  const data = await getDashboardData(project.id, rangeKey, start, end, moduleId, releaseId)

  return {
    range: { key: rangeKey, start, end },
    ...data
  }
})
