// nightly job that populates dashboard_daily_metrics so the dashboard's
// snapshot path in dashboardRepository.getSnapshotMetrics/getPassRate has
// something to read instead of always falling through to the live
// queries. Vercel Cron always calls this with GET, so this is a GET
// handler, gated by the same CRON_SECRET every other secret-gated thing
// in this app is configured to use.
//
// metric_date is always "today" (the date the job runs on), so this
// should be scheduled late in the day, e.g. 23:55 UTC, so that by the
// time it fires, today's test executions are effectively all in.
//
// scope of rows written, deliberately not a full module x release
// cross product (that's unbounded and most combinations are never
// queried):
//   - one overall row: module_id null, release_id null
//   - one row per module: module_id set, release_id null
//   - one row per release: module_id null, release_id set
// a combined module+release filter on the dashboard still falls back to
// the live path today, same as before this job existed.
//
// every row is written with an upsert keyed on the same expression as
// the schema's unique index, metric_date + coalesce(module_id, -1) +
// coalesce(release_id, -1), so re-running this for the same day, either
// a manual retry or Vercel's own retry-on-failure, just overwrites that
// day's rows instead of duplicating or double-counting them.

import { useDb } from '~~/server/db/client'
import { dashboardRepository } from '~~/server/repositories/dashboardRepository'
import { requireCronSecret } from '~~/server/utils/cronAuth'

export default defineEventHandler(async (event) => {
  requireCronSecret(event)

  const sql = useDb()
  const metricDate = new Date().toISOString().slice(0, 10)

  const moduleRows = await sql`select id from modules`
  const releaseRows = await sql`select id from releases`
  const moduleIds = moduleRows.map((r: any) => r.id as number)
  const releaseIds = releaseRows.map((r: any) => r.id as number)

  // (moduleId, releaseId) pairs to snapshot: one overall row, one per
  // module, one per release, never a module+release cross product
  const scopes: Array<{ moduleId: number | null; releaseId: number | null }> = [
    { moduleId: null, releaseId: null },
    ...moduleIds.map((id) => ({ moduleId: id, releaseId: null })),
    ...releaseIds.map((id) => ({ moduleId: null, releaseId: id }))
  ]

  let rowsWritten = 0

  for (const scope of scopes) {
    const snapshot = await dashboardRepository.computeLiveSnapshot(scope.moduleId, scope.releaseId)
    const deltas = await dashboardRepository.getDailyExecutionCounts(metricDate, scope.moduleId, scope.releaseId)

    await sql`
      insert into dashboard_daily_metrics (
        metric_date, module_id, release_id, total_requirements, covered_requirements,
        total_test_cases, automated_test_cases, open_bugs, open_critical_high,
        total_executions, passed_executions
      ) values (
        ${metricDate}::date, ${scope.moduleId}::int, ${scope.releaseId}::int,
        ${snapshot.total_requirements}, ${snapshot.covered_requirements},
        ${snapshot.total_test_cases}, ${snapshot.automated_test_cases},
        ${snapshot.open_bugs}, ${snapshot.open_critical_high},
        ${deltas.total_executions}, ${deltas.passed_executions}
      )
      on conflict (metric_date, coalesce(module_id, -1), coalesce(release_id, -1))
      do update set
        total_requirements = excluded.total_requirements,
        covered_requirements = excluded.covered_requirements,
        total_test_cases = excluded.total_test_cases,
        automated_test_cases = excluded.automated_test_cases,
        open_bugs = excluded.open_bugs,
        open_critical_high = excluded.open_critical_high,
        total_executions = excluded.total_executions,
        passed_executions = excluded.passed_executions
    `
    rowsWritten += 1
  }

  return { metricDate, rowsWritten }
})
