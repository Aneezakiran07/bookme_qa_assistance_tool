import { useDb } from '../db/client'

export interface BugRecord {
  id: number
  title: string
  module_id: number
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  priority: 'High' | 'Medium' | 'Low' | null
  status: string
  owner_id: number | null
  environment_build: string | null
  linked_test_case_id: number | null
  release_id: number | null
  steps_to_reproduce: string | null
  actual_result: string | null
  dev_notes: string | null
  reported_by: number | null
  reported_at: string
  last_status_change_at: string
  archived: boolean
}

export interface BugWithMeta extends BugRecord {
  bug_code?: string
  module_name: string
  owner_email: string | null
  reported_by_email: string | null
  release_version: string | null
  linked_test_case_title: string | null
  linked_test_case_steps: string | null
  linked_test_case_expected_result: string | null
}

export interface BugFilters {
  moduleId?: number
  severity?: string
  status?: string
  releaseId?: number
  // optional activity window, same idea as DeveloperBugFilters below --
  // filters on last_status_change_at so the QA/Tester Bug Tracker can
  // filter by day/week/month exactly like the Developer Bugs Directory
  periodStart?: string
  periodEnd?: string
}

export type DeveloperBugScope = 'mine' | 'team'

export interface DeveloperBugFilters {
  moduleId?: number
  severity?: string
  status?: string
  periodStart?: string
  periodEnd?: string
}

export interface BugMetrics {
  total_open: number
  critical_high_open: number
  in_retest: number
  closed: number
}

export const bugRepository = {
  async list(filters: BugFilters = {}): Promise<BugWithMeta[]> {
    const sql = useDb()
    const rows = await sql`
      select
        b.*,
        m.name as module_name,
        owner.email as owner_email,
        reporter.email as reported_by_email,
        r.version as release_version,
        tc.title as linked_test_case_title
      from bugs b
      join modules m on m.id = b.module_id
      left join users owner on owner.id = b.owner_id
      left join users reporter on reporter.id = b.reported_by
      left join releases r on r.id = b.release_id
      left join test_cases tc on tc.id = b.linked_test_case_id
      where
        b.archived = false
        and (${filters.moduleId ?? null}::int is null or b.module_id = ${filters.moduleId ?? null}::int)
        and (${filters.severity ?? null}::text is null or b.severity = ${filters.severity ?? null}::text)
        and (${filters.status ?? null}::text is null or b.status = ${filters.status ?? null}::text)
        and (${filters.releaseId ?? null}::int is null or b.release_id = ${filters.releaseId ?? null}::int)
        and (${filters.periodStart ?? null}::date is null or b.last_status_change_at >= ${filters.periodStart ?? null}::date)
        and (${filters.periodEnd ?? null}::date is null or b.last_status_change_at < (${filters.periodEnd ?? null}::date + interval '1 day'))
      order by b.reported_at desc
    `
    return rows as BugWithMeta[]
  },

  async findByIdWithMeta(id: number): Promise<BugWithMeta | null> {
    const sql = useDb()
    const rows = await sql`
      select
        b.*,
        m.name as module_name,
        owner.email as owner_email,
        reporter.email as reported_by_email,
        r.version as release_version,
        tc.title as linked_test_case_title
      from bugs b
      join modules m on m.id = b.module_id
      left join users owner on owner.id = b.owner_id
      left join users reporter on reporter.id = b.reported_by
      left join releases r on r.id = b.release_id
      left join test_cases tc on tc.id = b.linked_test_case_id
      where b.id = ${id}
    `
    return (rows[0] as BugWithMeta) ?? null
  },

  // powers the 4 metric cards on the list page. deliberately unfiltered
  // by the current table filters, same as a dashboard summary, so the
  // header numbers stay a stable overview while the table below narrows
  async metrics(): Promise<BugMetrics> {
    const sql = useDb()
    const rows = await sql`
      select
        count(*) filter (where status != 'Closed')::int as total_open,
        count(*) filter (where status != 'Closed' and severity in ('Critical', 'High'))::int as critical_high_open,
        count(*) filter (where status = 'Retest')::int as in_retest,
        count(*) filter (where status = 'Closed')::int as closed
      from bugs
      where archived = false
    `
    return rows[0] as BugMetrics
  },

  async findById(id: number): Promise<BugRecord | null> {
    const sql = useDb()
    const rows = await sql`select * from bugs where id = ${id}`
    return (rows[0] as BugRecord) ?? null
  },

  // -- Developer Bugs view (app/pages/developer/bugs/index.vue) --
  // userId always comes from the caller's authenticated session, never
  // from the query string, so a developer can only ever pull their own
  // "mine"/"blockers"/"pending" queues -- only the "team" scope
  // deliberately has no owner_id restriction at all.
  //
  // there is no 'Wont Fix' status in this schema (see the check
  // constraint on bugs.status), so "active" here just means anything
  // short of Closed. "pending" (verification) means the developer has
  // already moved the bug to Fixed or handed it to Retest and is
  // waiting on QA to confirm it, not a status of its own.
  //
  // periodStart/periodEnd are an optional activity window on top of the
  // scope and the other filters -- same "did this bug's last_status_change_at
  // fall in this window" idea as the profile page's day/week digest, just
  // exposed here too (day/week/month) so a developer can look further back
  // than "right now" without leaving the full directory. left unset, the
  // directory behaves exactly as before: every non archived bug in scope,
  // no matter when it last moved.
  async listForDeveloper(
    userId: number,
    scope: DeveloperBugScope,
    filters: DeveloperBugFilters = {}
  ): Promise<BugWithMeta[]> {
    const sql = useDb()
    // "mine" is restricted to bugs owned by this developer, and "team"
    // intentionally sees everyone's -- severity/status are now plain
    // optional equality filters layered on top of whichever scope is
    // active, same as moduleId already was, rather than scope-specific
    // baked-in clauses
    const scopeOwnerId = scope === 'mine' ? userId : null

    const rows = await sql`
      select
        b.*,
        'BUG-' || lpad(b.id::text, 3, '0') as bug_code,
        m.name as module_name,
        owner.email as owner_email,
        reporter.email as reported_by_email,
        r.version as release_version,
        tc.title as linked_test_case_title,
        tc.steps as linked_test_case_steps,
        tc.expected_result as linked_test_case_expected_result
      from bugs b
      join modules m on m.id = b.module_id
      left join users owner on owner.id = b.owner_id
      left join users reporter on reporter.id = b.reported_by
      left join releases r on r.id = b.release_id
      left join test_cases tc on tc.id = b.linked_test_case_id
      where
        b.archived = false
        and (${scopeOwnerId}::int is null or b.owner_id = ${scopeOwnerId}::int)
        and (${filters.moduleId ?? null}::int is null or b.module_id = ${filters.moduleId ?? null}::int)
        and (${filters.severity ?? null}::text is null or b.severity = ${filters.severity ?? null}::text)
        and (${filters.status ?? null}::text is null or b.status = ${filters.status ?? null}::text)
        and (${filters.periodStart ?? null}::date is null or b.last_status_change_at >= ${filters.periodStart ?? null}::date)
        and (${filters.periodEnd ?? null}::date is null or b.last_status_change_at < (${filters.periodEnd ?? null}::date + interval '1 day'))
      order by b.reported_at desc
    `
    return rows as BugWithMeta[]
  },

  // used by the Log Bug flow to catch duplicates: if a test case already
  // has a non closed, non archived bug against it, the modal should offer
  // to reopen or link to that ticket instead of silently creating a new
  // one for the same underlying defect
  async findOpenByTestCase(testCaseId: number): Promise<BugWithMeta | null> {
    const sql = useDb()
    const rows = await sql`
      select
        b.*,
        m.name as module_name,
        owner.email as owner_email,
        reporter.email as reported_by_email,
        r.version as release_version,
        tc.title as linked_test_case_title
      from bugs b
      join modules m on m.id = b.module_id
      left join users owner on owner.id = b.owner_id
      left join users reporter on reporter.id = b.reported_by
      left join releases r on r.id = b.release_id
      left join test_cases tc on tc.id = b.linked_test_case_id
      where b.linked_test_case_id = ${testCaseId}
        and b.status != 'Closed'
        and b.archived = false
      order by b.reported_at desc
      limit 1
    `
    return (rows[0] as BugWithMeta) ?? null
  },

  // dynamic partial update: only the fields present in `fields` are
  // touched. `status` and `owner_id` changes are audited by the caller
  // (the PUT endpoint), not here, so this stays a plain column update
  async update(id: number, fields: Partial<{
    title: string
    severity: string
    priority: string | null
    status: string
    owner_id: number | null
    environment_build: string | null
    linked_test_case_id: number | null
    release_id: number | null
    steps_to_reproduce: string | null
    actual_result: string | null
    dev_notes: string | null
    last_status_change_at: string
  }>): Promise<BugRecord | null> {
    const sql = useDb()
    const entries = Object.entries(fields).filter(([, v]) => v !== undefined)
    if (entries.length === 0) {
      return this.findById(id)
    }

    const setClauses = entries.map(([key], index) => `${key} = $${index + 2}`).join(', ')
    const values = entries.map(([, value]) => value)
    const rows = await sql(
      `update bugs set ${setClauses} where id = $1 returning *`,
      [id, ...values]
    )
    return (rows[0] as BugRecord) ?? null
  },

  // soft delete only, matches requirements' pattern: the row, its
  // attachments, assignment log, and status history all stay in place
  // so a bug's audit trail and reporting are never lost
  async archive(id: number): Promise<BugRecord | null> {
    const sql = useDb()
    const rows = await sql`
      update bugs set archived = true where id = ${id}
      returning *
    `
    return (rows[0] as BugRecord) ?? null
  },

  async create(input: {
    title: string
    moduleId: number
    severity: string
    priority: string | null
    environmentBuild: string | null
    linkedTestCaseId: number | null
    releaseId: number | null
    stepsToReproduce: string | null
    actualResult: string | null
    reportedBy: number
  }): Promise<BugRecord> {
    const sql = useDb()
    const rows = await sql`
      insert into bugs (
        title, module_id, severity, priority, status,
        environment_build, linked_test_case_id, release_id,
        steps_to_reproduce, actual_result, reported_by
      )
      values (
        ${input.title},
        ${input.moduleId},
        ${input.severity},
        ${input.priority},
        'Open',
        ${input.environmentBuild},
        ${input.linkedTestCaseId},
        ${input.releaseId},
        ${input.stepsToReproduce},
        ${input.actualResult},
        ${input.reportedBy}
      )
      returning *
    `
    return rows[0] as BugRecord
  }
}
