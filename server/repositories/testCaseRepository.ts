import { useDb } from '../db/client'

export interface TestCaseRecord {
  id: number
  title: string
  module_id: number
  steps: string | null
  expected_result: string | null
  priority: 'High' | 'Medium' | 'Low' | null
  type: 'Manual' | 'Automated'
  created_by: number | null
  last_modified_by: number | null
  last_modified_at: string
  created_at: string
  archived: boolean
}

// same shape as TestCaseRecord plus everything the Test Case Repository
// table needs to render in one request: the module name and the array of
// linked requirement ids (so "Linked Reqs" never needs a second round
// trip per row).
export interface TestCaseWithMeta extends TestCaseRecord {
  module_name: string
  linked_requirement_ids: number[]
  linked_release_ids: number[]
}

export interface TestCaseFilters {
  moduleId?: number
  priority?: string
  type?: string
  releaseId?: number
}

export const testCaseRepository = {
  async list(projectId: number, filters: TestCaseFilters = {}): Promise<TestCaseWithMeta[]> {
    const sql = useDb()
    const rows = await sql`
      select
        tc.*,
        m.name as module_name,
        coalesce(l.req_ids, '{}') as linked_requirement_ids,
        coalesce(rl.release_ids, '{}') as linked_release_ids
      from test_cases tc
      join modules m on m.id = tc.module_id
      left join (
        select l.test_case_id, array_agg(l.requirement_id order by l.requirement_id) as req_ids
        from requirement_test_case_links l
        join requirements r on r.id = l.requirement_id and r.archived = false
        group by l.test_case_id
      ) l on l.test_case_id = tc.id
      left join (
        select test_case_id, array_agg(release_id order by release_id) as release_ids
        from test_case_release_links
        group by test_case_id
      ) rl on rl.test_case_id = tc.id
      where
        tc.archived = false
        and tc.project_id = ${projectId}
        and (${filters.moduleId ?? null}::int is null or tc.module_id = ${filters.moduleId ?? null}::int)
        and (${filters.priority ?? null}::text is null or tc.priority = ${filters.priority ?? null}::text)
        and (${filters.type ?? null}::text is null or tc.type = ${filters.type ?? null}::text)
        and (
          ${filters.releaseId ?? null}::int is null
          or exists (
            select 1 from test_case_release_links trl
            where trl.test_case_id = tc.id and trl.release_id = ${filters.releaseId ?? null}::int
          )
        )
      order by tc.created_at desc
    `
    return rows as TestCaseWithMeta[]
  },

  async findById(projectId: number, id: number): Promise<TestCaseRecord | null> {
    const sql = useDb()
    const rows = await sql`select * from test_cases where id = ${id} and project_id = ${projectId}`
    return (rows[0] as TestCaseRecord) ?? null
  },

  async linkedRequirementIds(id: number): Promise<number[]> {
    const sql = useDb()
    const rows = await sql`
      select l.requirement_id
      from requirement_test_case_links l
      join requirements r on r.id = l.requirement_id and r.archived = false
      where l.test_case_id = ${id}
    `
    return rows.map((r: any) => r.requirement_id)
  },

  async linkedReleaseIds(id: number): Promise<number[]> {
    const sql = useDb()
    const rows = await sql`
      select release_id from test_case_release_links where test_case_id = ${id}
    `
    return rows.map((r: any) => r.release_id)
  },

  // used by the execution flow to confirm a test case is actually part
  // of the given release's suite before an execution can be logged
  // against it
  async isLinkedToRelease(testCaseId: number, releaseId: number): Promise<boolean> {
    const sql = useDb()
    const rows = await sql`
      select 1 from test_case_release_links
      where test_case_id = ${testCaseId} and release_id = ${releaseId}
      limit 1
    `
    return rows.length > 0
  },

  async create(projectId: number, input: {
    title: string
    moduleId: number
    steps: string | null
    expectedResult: string | null
    priority: string | null
    type: string
    requirementIds: number[]
    releaseIds: number[]
    createdBy: number
  }): Promise<TestCaseRecord> {
    const sql = useDb()
    const rows = await sql`
      insert into test_cases (project_id, title, module_id, steps, expected_result, priority, type, created_by, last_modified_by)
      values (
        ${projectId},
        ${input.title},
        ${input.moduleId},
        ${input.steps},
        ${input.expectedResult},
        ${input.priority},
        ${input.type},
        ${input.createdBy},
        ${input.createdBy}
      )
      returning *
    `
    const created = rows[0] as TestCaseRecord
    await this.setRequirementLinks(created.id, input.requirementIds)
    await this.setReleaseLinks(created.id, input.releaseIds)
    return created
  },

  // partial update: only columns present in patch are touched
  async update(
    projectId: number,
    id: number,
    patch: {
      title?: string
      moduleId?: number
      steps?: string | null
      expectedResult?: string | null
      priority?: string | null
      type?: string
      lastModifiedBy: number
    }
  ): Promise<TestCaseRecord | null> {
    const sql = useDb()
    const current = await this.findById(projectId, id)
    if (!current) return null

    const rows = await sql`
      update test_cases set
        title = ${patch.title ?? current.title},
        module_id = ${patch.moduleId ?? current.module_id},
        steps = ${patch.steps !== undefined ? patch.steps : current.steps},
        expected_result = ${patch.expectedResult !== undefined ? patch.expectedResult : current.expected_result},
        priority = ${patch.priority !== undefined ? patch.priority : current.priority},
        type = ${patch.type ?? current.type},
        last_modified_by = ${patch.lastModifiedBy},
        last_modified_at = now()
      where id = ${id} and project_id = ${projectId}
      returning *
    `
    return (rows[0] as TestCaseRecord) ?? null
  },

  // replaces the full set of linked requirements for a test case: clears
  // existing links then re-inserts the given ids, so callers never have
  // to diff the old vs new set themselves.
  async setRequirementLinks(testCaseId: number, requirementIds: number[]): Promise<void> {
    const sql = useDb()
    const idList = [...new Set(requirementIds)].join(',')
    // both statements run in one transaction, so a failed insert leaves the old links untouched
    await sql.transaction([
      // only links that are no longer wanted are removed
      sql`
        delete from requirement_test_case_links
        where test_case_id = ${testCaseId}
          and requirement_id <> all(string_to_array(${idList}, ',')::int[])
      `,
      // links that already exist are skipped
      sql`
        insert into requirement_test_case_links (test_case_id, requirement_id)
        select ${testCaseId}::int, unnest(string_to_array(${idList}, ',')::int[])
        on conflict do nothing
      `
    ])
  },

  // same replace-the-whole-set pattern as setRequirementLinks, for the
  // releases a test case is assigned to. Only test cases linked here for
  // a given release show up in that release's execution workspace.
  async setReleaseLinks(testCaseId: number, releaseIds: number[]): Promise<void> {
    const sql = useDb()
    const idList = [...new Set(releaseIds)].join(',')
    // both statements run in one transaction, so a failed insert leaves the old links untouched
    await sql.transaction([
      // only links that are no longer wanted are removed
      sql`
        delete from test_case_release_links
        where test_case_id = ${testCaseId}
          and release_id <> all(string_to_array(${idList}, ',')::int[])
      `,
      // links that already exist are skipped
      sql`
        insert into test_case_release_links (test_case_id, release_id)
        select ${testCaseId}::int, unnest(string_to_array(${idList}, ',')::int[])
        on conflict do nothing
      `
    ])
  },

  // soft delete only, matches the schema's archived flag. the row, its
  // links, and its execution history all stay in place -- test_executions
  // has an `on delete restrict` FK to test_cases specifically so a hard
  // delete here would 500 once a test case has any runs logged against it.
  // how many of the given test case ids really belong to this project
  async countInProject(projectId: number, ids: number[]): Promise<number> {
    if (ids.length === 0) return 0
    const sql = useDb()
    const rows = await sql`
      select count(*)::int as cnt from test_cases
      where project_id = ${projectId} and id = any(string_to_array(${ids.join(',')}, ',')::int[])
    `
    return (rows[0] as any).cnt as number
  },

  async archive(projectId: number, id: number): Promise<TestCaseRecord | null> {
    const sql = useDb()
    const rows = await sql`
      update test_cases set archived = true where id = ${id} and project_id = ${projectId}
      returning *
    `
    return (rows[0] as TestCaseRecord) ?? null
  },

  // creates a copy of an existing test case (title suffixed "(Copy)") and
  // carries over its requirement links, used by the table's Duplicate action
  async duplicate(projectId: number, id: number, duplicatedBy: number): Promise<TestCaseRecord | null> {
    const sql = useDb()
    const source = await this.findById(projectId, id)
    if (!source) return null

    const links = await this.linkedRequirementIds(id)
    const releaseLinks = await this.linkedReleaseIds(id)
    const rows = await sql`
      insert into test_cases (project_id, title, module_id, steps, expected_result, priority, type, created_by, last_modified_by)
      values (
        ${projectId},
        ${`${source.title} (Copy)`},
        ${source.module_id},
        ${source.steps},
        ${source.expected_result},
        ${source.priority},
        ${source.type},
        ${duplicatedBy},
        ${duplicatedBy}
      )
      returning *
    `
    const created = rows[0] as TestCaseRecord
    await this.setRequirementLinks(created.id, links)
    await this.setReleaseLinks(created.id, releaseLinks)
    return created
  }
}