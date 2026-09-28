import { useDb } from '../db/client'

export interface ReleaseRecord {
  id: number
  version: string
  release_date: string | null
  created_at: string
}

export interface ReleaseWithStats extends ReleaseRecord {
  total_test_cases: number
  executed_count: number
  passed_count: number
  failed_count: number
  blocked_count: number
  pass_rate: number
  open_blockers: number
}

// same aggregate shape as ReleaseWithStats, plus the bug totals the
// health hub's "Automated Release Summary" tab needs. Kept as a separate
// shape (rather than folding into ReleaseWithStats) since the /releases
// list only ever needs open_blockers, not the full open/resolved split.
export interface ReleaseHealthStats {
  total_test_cases: number
  executed_count: number
  passed_count: number
  failed_count: number
  blocked_count: number
  pass_rate: number
  open_bugs: number
  resolved_bugs: number
  open_blockers: number
}

export interface ReleaseExecutionHistoryRow {
  id: number
  test_case_id: number
  test_case_title_snapshot: string | null
  result: 'Pass' | 'Fail' | 'Blocked' | 'Not Run'
  executed_by_email: string | null
  execution_date: string
  actual_result: string | null
}

export const releaseRepository = {
  // one row per release with aggregate stats for the table on /executions
  // and /releases. "executed" counts test cases with at least one
  // execution row in this release; pass_rate is passed / executed (not /
  // total), so a release with nothing executed shows 0 rather than a
  // misleading percentage. open_blockers is open Critical/High bugs
  // against the release, used for the "Release Blockers" metric.
  async listWithStats(): Promise<ReleaseWithStats[]> {
    const sql = useDb()
    const rows = await sql`
      with latest_executions as (
        select distinct on (release_id, test_case_id)
          release_id, test_case_id, result
        from test_executions
        order by release_id, test_case_id, execution_date desc
      ),
      suite_counts as (
        select release_id, count(*)::int as total
        from test_case_release_links
        group by release_id
      ),
      blocker_counts as (
        select release_id, count(*)::int as total
        from bugs
        where archived = false
          and status != 'Closed'
          and severity in ('Critical', 'High')
        group by release_id
      )
      select
        r.*,
        coalesce(sc.total, 0)::int as total_test_cases,
        coalesce(count(le.test_case_id), 0)::int as executed_count,
        coalesce(count(le.test_case_id) filter (where le.result = 'Pass'), 0)::int as passed_count,
        coalesce(count(le.test_case_id) filter (where le.result = 'Fail'), 0)::int as failed_count,
        coalesce(count(le.test_case_id) filter (where le.result = 'Blocked'), 0)::int as blocked_count,
        case
          when count(le.test_case_id) = 0 then 0::float
          else round(
            100.0 * count(le.test_case_id) filter (where le.result = 'Pass')
            / count(le.test_case_id),
            1
          )::float
        end as pass_rate,
        coalesce(bc.total, 0)::int as open_blockers
      from releases r
      left join suite_counts sc on sc.release_id = r.id
      left join latest_executions le on le.release_id = r.id
      left join blocker_counts bc on bc.release_id = r.id
      group by r.id, sc.total, bc.total
      order by r.created_at desc
    `
    return rows as ReleaseWithStats[]
  },

  // single-release version of the aggregate above, plus the open/resolved
  // bug split the health hub's summary tab needs. Kept as its own query
  // (rather than filtering listWithStats client-side) since it needs the
  // extra bug breakdown that the list table doesn't.
  async getHealthStats(releaseId: number): Promise<ReleaseHealthStats> {
    const sql = useDb()
    const rows = await sql`
      with latest_executions as (
        select distinct on (test_case_id)
          test_case_id, result
        from test_executions
        where release_id = ${releaseId}
        order by test_case_id, execution_date desc
      ),
      suite_count as (
        select count(*)::int as total
        from test_case_release_links
        where release_id = ${releaseId}
      ),
      bug_counts as (
        select
          count(*) filter (where status != 'Closed')::int as open_bugs,
          count(*) filter (where status = 'Closed')::int as resolved_bugs,
          count(*) filter (where status != 'Closed' and severity in ('Critical', 'High'))::int as open_blockers
        from bugs
        where archived = false and release_id = ${releaseId}
      )
      select
        (select total from suite_count)::int as total_test_cases,
        coalesce(count(le.test_case_id), 0)::int as executed_count,
        coalesce(count(le.test_case_id) filter (where le.result = 'Pass'), 0)::int as passed_count,
        coalesce(count(le.test_case_id) filter (where le.result = 'Fail'), 0)::int as failed_count,
        coalesce(count(le.test_case_id) filter (where le.result = 'Blocked'), 0)::int as blocked_count,
        case
          when count(le.test_case_id) = 0 then 0::float
          else round(
            100.0 * count(le.test_case_id) filter (where le.result = 'Pass')
            / count(le.test_case_id),
            1
          )::float
        end as pass_rate,
        coalesce((select open_bugs from bug_counts), 0)::int as open_bugs,
        coalesce((select resolved_bugs from bug_counts), 0)::int as resolved_bugs,
        coalesce((select open_blockers from bug_counts), 0)::int as open_blockers
      -- "from (select 1) as one_row left join latest_executions" (rather
      -- than driving from latest_executions directly) guarantees exactly
      -- one output row even when the release has zero executions yet;
      -- otherwise the aggregates below would return no rows at all.
      from (select 1) as one_row
      left join latest_executions le on true
    `
    return rows[0] as ReleaseHealthStats
  },

  // read-only feed for the Execution History tab. test_executions is
  // append-only, so this is simply every row ever recorded for the
  // release, newest first. Uses the snapshot title (not a join to
  // test_cases) so a later rename of the test case never rewrites what
  // a past run says it tested.
  async executionHistory(releaseId: number): Promise<ReleaseExecutionHistoryRow[]> {
    const sql = useDb()
    const rows = await sql`
      select
        te.id,
        te.test_case_id,
        te.test_case_title_snapshot,
        te.result,
        u.email as executed_by_email,
        te.execution_date,
        te.actual_result
      from test_executions te
      left join users u on u.id = te.executed_by
      where te.release_id = ${releaseId}
      order by te.execution_date desc
    `
    return rows as ReleaseExecutionHistoryRow[]
  },

  async findById(id: number): Promise<ReleaseRecord | null> {
    const sql = useDb()
    const rows = await sql`select * from releases where id = ${id}`
    return (rows[0] as ReleaseRecord) ?? null
  },

  async findByVersion(version: string): Promise<ReleaseRecord | null> {
    const sql = useDb()
    const rows = await sql`select * from releases where lower(version) = lower(${version})`
    return (rows[0] as ReleaseRecord) ?? null
  },

  async create(input: {
    version: string
    releaseDate: string | null
  }): Promise<ReleaseRecord> {
    const sql = useDb()
    const rows = await sql`
      insert into releases (version, release_date)
      values (${input.version}, ${input.releaseDate})
      returning *
    `
    return rows[0] as ReleaseRecord
  },

  // dynamic partial update, same pattern as bugRepository.update: only
  // columns present in `fields` are touched. There is no updated_at
  // column on releases, so nothing else needs to move alongside these.
  async update(id: number, fields: Partial<{
    version: string
    release_date: string | null
  }>): Promise<ReleaseRecord | null> {
    const sql = useDb()
    const entries = Object.entries(fields).filter(([, v]) => v !== undefined)
    if (entries.length === 0) {
      return this.findById(id)
    }

    const setClauses = entries.map(([key], index) => `${key} = $${index + 2}`).join(', ')
    const values = entries.map(([, value]) => value)
    const rows = await sql(
      `update releases set ${setClauses} where id = $1 returning *`,
      [id, ...values]
    )
    return (rows[0] as ReleaseRecord) ?? null
  },

  // hard delete: test_case_release_links cascades automatically, but
  // test_executions and bugs both reference releases without cascade, so
  // Postgres raises a foreign-key violation if either has rows for this
  // release. The caller (the DELETE endpoint) is expected to catch that
  // and turn it into a friendly 409 rather than a raw DB error.
  async delete(id: number): Promise<ReleaseRecord | null> {
    const sql = useDb()
    const rows = await sql`delete from releases where id = ${id} returning *`
    return (rows[0] as ReleaseRecord) ?? null
  },

  // replaces the full set of test cases scoped to this release: clears
  // existing links then re-inserts the given ids. Mirrors
  // testCaseRepository.setReleaseLinks but keyed the other way round
  // (one release, many test cases) for the Scoped Test Suite tab's bulk
  // add/remove UI.
  async syncTestCases(releaseId: number, testCaseIds: number[]): Promise<void> {
    const sql = useDb()
    await sql`delete from test_case_release_links where release_id = ${releaseId}`
    const uniqueIds = [...new Set(testCaseIds)]
    for (const testCaseId of uniqueIds) {
      await sql`
        insert into test_case_release_links (test_case_id, release_id)
        values (${testCaseId}, ${releaseId})
        on conflict do nothing
      `
    }
  }
}
