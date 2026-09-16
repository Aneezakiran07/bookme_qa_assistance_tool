import { useDb } from '../db/client'

export interface ExecutionRecord {
  id: number
  test_case_id: number
  release_id: number
  result: 'Pass' | 'Fail' | 'Blocked' | 'Not Run'
  executed_by: number
  execution_date: string
  notes: string | null
}

export interface TestCaseExecutionState {
  id: number
  title: string
  module_id: number
  module_name: string
  steps: string | null
  expected_result: string | null
  priority: 'High' | 'Medium' | 'Low' | null
  type: string
  latest_result: string | null
  last_executed_at: string | null
  last_executed_by_email: string | null
  latest_notes: string | null
  executions_count: number
}

export const executionRepository = {
  // Returns EVERY test case in the system with its latest execution state
  // for the given release. Per the pilot's design (no release->test_case
  // link table), every release is a full regression run: all test cases
  // appear, and this only tracks which have been executed. Null latest_result
  // means "not yet run in this release".
  async getReleaseState(releaseId: number): Promise<TestCaseExecutionState[]> {
    const sql = useDb()
    const rows = await sql`
      with latest as (
        select distinct on (test_case_id)
          test_case_id, result, execution_date, notes, executed_by
        from test_executions
        where release_id = ${releaseId}
        order by test_case_id, execution_date desc
      ),
      counts as (
        select test_case_id, count(*)::int as cnt
        from test_executions
        where release_id = ${releaseId}
        group by test_case_id
      )
      select
        tc.id,
        tc.title,
        tc.module_id,
        tc.steps,
        tc.expected_result,
        tc.priority,
        tc.type,
        m.name as module_name,
        l.result as latest_result,
        l.execution_date as last_executed_at,
        l.notes as latest_notes,
        u.email as last_executed_by_email,
        coalesce(c.cnt, 0) as executions_count
      from test_cases tc
      join modules m on m.id = tc.module_id
      left join latest l on l.test_case_id = tc.id
      left join counts c on c.test_case_id = tc.id
      left join users u on u.id = l.executed_by
      order by m.name asc, tc.title asc
    `
    return rows as TestCaseExecutionState[]
  },

  // Append-only insert. The DB trigger prevent_execution_modify blocks any
  // UPDATE or DELETE on this table, so this is genuinely the only way to
  // add execution history.
  async create(input: {
    testCaseId: number
    releaseId: number
    result: 'Pass' | 'Fail' | 'Blocked' | 'Not Run'
    notes: string | null
    executedBy: number
  }): Promise<ExecutionRecord> {
    const sql = useDb()
    const rows = await sql`
      insert into test_executions (test_case_id, release_id, result, notes, executed_by)
      values (${input.testCaseId}, ${input.releaseId}, ${input.result}, ${input.notes}, ${input.executedBy})
      returning *
    `
    return rows[0] as ExecutionRecord
  }
}
