import { useDb } from '../db/client'

export interface SnapshotMetrics {
  total_requirements: number
  covered_requirements: number
  total_test_cases: number
  automated_test_cases: number
  open_bugs: number
  open_critical_high: number
}

export interface PassRateResult {
  total_executions: number
  passed_executions: number
  pass_rate: number
  source: 'snapshot' | 'live'
}

export interface ExecutionTrendPoint {
  day: string
  pass_count: number
  fail_count: number
  blocked_count: number
}

export interface BugBreakdownRow {
  key: string
  count: number
}

function roundPct(numerator: number, denominator: number): number {
  if (!denominator) return 0
  return Math.round((numerator / denominator) * 1000) / 10
}

export const dashboardRepository = {
  // -- "current state" KPIs: requirement coverage, automation coverage,
  // open bug counts. These deliberately ignore the selected time range --
  // an exec dashboard's "Open Critical/High Bugs" card should show what's
  // open right now, not change because someone picked "30 Days" instead
  // of "7 Days" (that range only drives the trend widgets below).
  //
  // dashboard_daily_metrics is tried first since that's the fast path the
  // schema was built for once a nightly job populates it. If no snapshot
  // row exists yet for this exact module/release scope -- the expected
  // state today, since this pilot doesn't ship that nightly job -- this
  // falls back to live aggregates straight off requirements/test_cases/bugs.
  async getSnapshotMetrics(moduleId: number | null, releaseId: number | null): Promise<SnapshotMetrics & { source: 'snapshot' | 'live' }> {
    const sql = useDb()
    const snapshotRows = await sql`
      select * from dashboard_daily_metrics
      where module_id is not distinct from ${moduleId}
        and release_id is not distinct from ${releaseId}
      order by metric_date desc
      limit 1
    `
    if (snapshotRows.length > 0) {
      const row = snapshotRows[0] as any
      return {
        total_requirements: row.total_requirements,
        covered_requirements: row.covered_requirements,
        total_test_cases: row.total_test_cases,
        automated_test_cases: row.automated_test_cases,
        open_bugs: row.open_bugs,
        open_critical_high: row.open_critical_high,
        source: 'snapshot'
      }
    }

    const live = await this.computeLiveSnapshot(moduleId, releaseId)
    return { ...live, source: 'live' }
  },

  // requirements and test_cases have no release_id column (a requirement's
  // target_release is free text, not a FK), so only the module filter
  // applies to those two; the release filter still narrows the bug counts
  async computeLiveSnapshot(moduleId: number | null, releaseId: number | null): Promise<SnapshotMetrics> {
    const sql = useDb()

    const reqRows = await sql`
      select
        count(*)::int as total_requirements,
        count(*) filter (
          where exists (
            select 1 from requirement_test_case_links l where l.requirement_id = r.id
          )
        )::int as covered_requirements
      from requirements r
      where r.archived = false
        and (${moduleId}::int is null or r.module_id = ${moduleId}::int)
    `

    const tcRows = await sql`
      select
        count(*)::int as total_test_cases,
        count(*) filter (where type = 'Automated')::int as automated_test_cases
      from test_cases
      where (${moduleId}::int is null or module_id = ${moduleId}::int)
    `

    const bugRows = await sql`
      select
        count(*) filter (where status != 'Closed')::int as open_bugs,
        count(*) filter (where status != 'Closed' and severity in ('Critical', 'High'))::int as open_critical_high
      from bugs
      where archived = false
        and (${moduleId}::int is null or module_id = ${moduleId}::int)
        and (${releaseId}::int is null or release_id = ${releaseId}::int)
    `

    return {
      total_requirements: (reqRows[0] as any).total_requirements,
      covered_requirements: (reqRows[0] as any).covered_requirements,
      total_test_cases: (tcRows[0] as any).total_test_cases,
      automated_test_cases: (tcRows[0] as any).automated_test_cases,
      open_bugs: (bugRows[0] as any).open_bugs,
      open_critical_high: (bugRows[0] as any).open_critical_high
    }
  },

  // pass rate over the selected date range: SUM(passed)/SUM(total) across
  // the daily deltas, exactly as the schema's own worked example shows.
  // falls back to a live sum off test_executions when the snapshot table
  // has nothing for this range/scope -- most commonly "today", which
  // never has a row until a nightly job writes it.
  async getPassRate(
    startDate: string,
    endDate: string,
    moduleId: number | null,
    releaseId: number | null
  ): Promise<PassRateResult> {
    const sql = useDb()
    const snapshotRows = await sql`
      select
        coalesce(sum(total_executions), 0)::int as total,
        coalesce(sum(passed_executions), 0)::int as passed
      from dashboard_daily_metrics
      where metric_date between ${startDate}::date and ${endDate}::date
        and module_id is not distinct from ${moduleId}
        and release_id is not distinct from ${releaseId}
    `
    const snapshotTotal = (snapshotRows[0] as any).total as number

    if (snapshotTotal > 0) {
      const total = snapshotTotal
      const passed = (snapshotRows[0] as any).passed as number
      return { total_executions: total, passed_executions: passed, pass_rate: roundPct(passed, total), source: 'snapshot' }
    }

    const liveRows = await sql`
      select
        count(*)::int as total,
        count(*) filter (where te.result = 'Pass')::int as passed
      from test_executions te
      join test_cases tc on tc.id = te.test_case_id
      where te.execution_date::date between ${startDate}::date and ${endDate}::date
        and (${moduleId}::int is null or tc.module_id = ${moduleId}::int)
        and (${releaseId}::int is null or te.release_id = ${releaseId}::int)
    `
    const total = (liveRows[0] as any).total as number
    const passed = (liveRows[0] as any).passed as number
    return { total_executions: total, passed_executions: passed, pass_rate: roundPct(passed, total), source: 'live' }
  },

  // daily Pass/Fail/Blocked trend, always computed live: dashboard_daily_metrics
  // only stores a total and a passed count per day, not the Fail/Blocked
  // split this chart needs.
  async getExecutionTrend(
    startDate: string,
    endDate: string,
    moduleId: number | null,
    releaseId: number | null
  ): Promise<ExecutionTrendPoint[]> {
    const sql = useDb()
    const rows = await sql`
      select
        te.execution_date::date as day,
        count(*) filter (where te.result = 'Pass')::int as pass_count,
        count(*) filter (where te.result = 'Fail')::int as fail_count,
        count(*) filter (where te.result = 'Blocked')::int as blocked_count
      from test_executions te
      join test_cases tc on tc.id = te.test_case_id
      where te.execution_date::date between ${startDate}::date and ${endDate}::date
        and (${moduleId}::int is null or tc.module_id = ${moduleId}::int)
        and (${releaseId}::int is null or te.release_id = ${releaseId}::int)
      group by day
      order by day asc
    `
    return rows.map((r: any) => ({
      day: r.day,
      pass_count: r.pass_count,
      fail_count: r.fail_count,
      blocked_count: r.blocked_count
    }))
  },

  // active (not archived, not Closed) bug counts by severity and, per the
  // spec, by a fixed status subset (Open / In Progress / Retest)
  async getBugBreakdown(moduleId: number | null, releaseId: number | null): Promise<{ bySeverity: BugBreakdownRow[]; byStatus: BugBreakdownRow[] }> {
    const sql = useDb()
    const severityRows = await sql`
      select severity, count(*)::int as count
      from bugs
      where archived = false and status != 'Closed'
        and (${moduleId}::int is null or module_id = ${moduleId}::int)
        and (${releaseId}::int is null or release_id = ${releaseId}::int)
      group by severity
    `
    const statusRows = await sql`
      select status, count(*)::int as count
      from bugs
      where archived = false and status in ('Open', 'In Progress', 'Retest')
        and (${moduleId}::int is null or module_id = ${moduleId}::int)
        and (${releaseId}::int is null or release_id = ${releaseId}::int)
      group by status
    `
    return {
      bySeverity: severityRows.map((r: any) => ({ key: r.severity, count: r.count })),
      byStatus: statusRows.map((r: any) => ({ key: r.status, count: r.count }))
    }
  },

  // requirements have no release FK, so this only respects the module filter
  async getRequirementsStatusBreakdown(moduleId: number | null): Promise<BugBreakdownRow[]> {
    const sql = useDb()
    const rows = await sql`
      select status, count(*)::int as count
      from requirements
      where archived = false
        and (${moduleId}::int is null or module_id = ${moduleId}::int)
      group by status
    `
    return rows.map((r: any) => ({ key: r.status, count: r.count }))
  },

  async getCriticalBugsWatchlist(moduleId: number | null, releaseId: number | null, limit = 8) {
    const sql = useDb()
    const rows = await sql`
      select
        b.id, b.title, b.severity, b.status, b.reported_at,
        m.name as module_name
      from bugs b
      join modules m on m.id = b.module_id
      where b.archived = false and b.status != 'Closed'
        and b.severity in ('Critical', 'High')
        and (${moduleId}::int is null or b.module_id = ${moduleId}::int)
        and (${releaseId}::int is null or b.release_id = ${releaseId}::int)
      order by
        case b.severity when 'Critical' then 0 else 1 end,
        b.reported_at desc
      limit ${limit}
    `
    return rows
  },

  async getRecentExecutions(moduleId: number | null, releaseId: number | null, limit = 8) {
    const sql = useDb()
    const rows = await sql`
      select
        te.id, te.result, te.execution_date, te.notes,
        tc.title as test_case_title,
        m.name as module_name,
        u.email as executed_by_email,
        r.version as release_version
      from test_executions te
      join test_cases tc on tc.id = te.test_case_id
      join modules m on m.id = tc.module_id
      join users u on u.id = te.executed_by
      join releases r on r.id = te.release_id
      where (${moduleId}::int is null or tc.module_id = ${moduleId}::int)
        and (${releaseId}::int is null or te.release_id = ${releaseId}::int)
      order by te.execution_date desc
      limit ${limit}
    `
    return rows
  }
}
