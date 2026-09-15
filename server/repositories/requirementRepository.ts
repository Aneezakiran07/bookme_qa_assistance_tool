import { useDb } from '../db/client'

export interface RequirementRecord {
  id: number
  title: string
  module_id: number
  target_release: string | null
  status: 'Draft' | 'Approved' | 'In Testing' | 'Done'
  description: string | null
  created_by: number | null
  created_at: string
  archived: boolean
}

// same shape as RequirementRecord plus everything the Requirements table
// needs to render in one request: the module name, the creator's email,
// and how many test cases are currently linked, so the page never needs
// a second round trip per row.
export interface RequirementWithMeta extends RequirementRecord {
  module_name: string
  created_by_email: string | null
  linked_test_cases_count: number
}

export const requirementRepository = {
  // moduleId narrows the list to one module, same filter the page's
  // module dropdown uses. left undefined this returns every active
  // (non archived) requirement across all modules.
  async list(moduleId?: number): Promise<RequirementWithMeta[]> {
    const sql = useDb()
    const rows = moduleId
      ? await sql`
          select
            r.*,
            m.name as module_name,
            u.email as created_by_email,
            coalesce(l.cnt, 0)::int as linked_test_cases_count
          from requirements r
          join modules m on m.id = r.module_id
          left join users u on u.id = r.created_by
          left join (
            select requirement_id, count(*) as cnt
            from requirement_test_case_links
            group by requirement_id
          ) l on l.requirement_id = r.id
          where r.archived = false and r.module_id = ${moduleId}
          order by r.created_at desc
        `
      : await sql`
          select
            r.*,
            m.name as module_name,
            u.email as created_by_email,
            coalesce(l.cnt, 0)::int as linked_test_cases_count
          from requirements r
          join modules m on m.id = r.module_id
          left join users u on u.id = r.created_by
          left join (
            select requirement_id, count(*) as cnt
            from requirement_test_case_links
            group by requirement_id
          ) l on l.requirement_id = r.id
          where r.archived = false
          order by r.created_at desc
        `
    return rows as RequirementWithMeta[]
  },

  async findById(id: number): Promise<RequirementRecord | null> {
    const sql = useDb()
    const rows = await sql`select * from requirements where id = ${id}`
    return (rows[0] as RequirementRecord) ?? null
  },

  async create(input: {
    title: string
    moduleId: number
    targetRelease: string | null
    status: string
    description: string | null
    createdBy: number
  }): Promise<RequirementRecord> {
    const sql = useDb()
    const rows = await sql`
      insert into requirements (title, module_id, target_release, status, description, created_by)
      values (
        ${input.title},
        ${input.moduleId},
        ${input.targetRelease},
        ${input.status},
        ${input.description},
        ${input.createdBy}
      )
      returning *
    `
    return rows[0] as RequirementRecord
  },

  // partial update: only columns present in patch are touched, so a
  // status-only transition doesn't require resending the whole form
  async update(
    id: number,
    patch: {
      title?: string
      moduleId?: number
      targetRelease?: string | null
      status?: string
      description?: string | null
    }
  ): Promise<RequirementRecord | null> {
    const sql = useDb()
    const current = await this.findById(id)
    if (!current) return null

    const rows = await sql`
      update requirements set
        title = ${patch.title ?? current.title},
        module_id = ${patch.moduleId ?? current.module_id},
        target_release = ${patch.targetRelease !== undefined ? patch.targetRelease : current.target_release},
        status = ${patch.status ?? current.status},
        description = ${patch.description !== undefined ? patch.description : current.description}
      where id = ${id}
      returning *
    `
    return (rows[0] as RequirementRecord) ?? null
  },

  // soft delete only, matches the schema's archived flag. the row and
  // its links stay in place so history and reporting are not lost.
  async archive(id: number): Promise<RequirementRecord | null> {
    const sql = useDb()
    const rows = await sql`
      update requirements set archived = true where id = ${id}
      returning *
    `
    return (rows[0] as RequirementRecord) ?? null
  }
}
