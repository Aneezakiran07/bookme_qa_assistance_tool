import { useDb } from '../db/client'

export interface ReleaseRecord {
  id: number
  version: string
  release_date: string | null
  regression_status: 'Not Started' | 'In Progress' | 'Passed' | 'Failed'
  created_at: string
}

export interface ReleaseWithStats extends ReleaseRecord {
  total_test_cases: number
  executed_count: number
  passed_count: number
  failed_count: number
  blocked_count: number
  pass_rate: number
}

export const releaseRepository = {
  // one row per release with aggregate stats for the table on /executions.
  // "executed" counts test cases with at least one execution row in this
  // release; pass_rate is passed / executed (not / total), so a release
  // with nothing executed shows 0 rather than a misleading percentage.
  async listWithStats(): Promise<ReleaseWithStats[]> {
    const sql = useDb()
    const rows = await sql`
      with latest_executions as (
        select distinct on (release_id, test_case_id)
          release_id, test_case_id, result
        from test_executions
        order by release_id, test_case_id, execution_date desc
      )
      select
        r.*,
        (select count(*) from test_cases)::int as total_test_cases,
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
        end as pass_rate
      from releases r
      left join latest_executions le on le.release_id = r.id
      group by r.id
      order by r.created_at desc
    `
    return rows as ReleaseWithStats[]
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
    regressionStatus: string
  }): Promise<ReleaseRecord> {
    const sql = useDb()
    const rows = await sql`
      insert into releases (version, release_date, regression_status)
      values (${input.version}, ${input.releaseDate}, ${input.regressionStatus})
      returning *
    `
    return rows[0] as ReleaseRecord
  }
}
