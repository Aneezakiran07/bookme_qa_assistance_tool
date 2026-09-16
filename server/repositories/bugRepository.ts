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
  reported_by: number | null
  reported_at: string
  last_status_change_at: string
  archived: boolean
}

export interface BugWithMeta extends BugRecord {
  module_name: string
  owner_email: string | null
  reported_by_email: string | null
  release_version: string | null
  linked_test_case_title: string | null
}

export interface BugFilters {
  moduleId?: number
  severity?: string
  status?: string
  releaseId?: number
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
    last_status_change_at: string
  }>): Promise<BugRecord | null> {
    const sql = useDb()
    const entries = Object.entries(fields).filter(([, v]) => v !== undefined)
    if (entries.length === 0) {
      return this.findById(id)
    }

    const setClauses = entries.map(([key], index) => `${key} = $${index + 2}`).join(', ')
    const values = entries.map(([, value]) => value)
    const rows = await sql.query(
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
    reportedBy: number
  }): Promise<BugRecord> {
    const sql = useDb()
    const rows = await sql`
      insert into bugs (
        title, module_id, severity, priority, status,
        environment_build, linked_test_case_id, release_id,
        steps_to_reproduce, reported_by
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
        ${input.reportedBy}
      )
      returning *
    `
    return rows[0] as BugRecord
  }
}
