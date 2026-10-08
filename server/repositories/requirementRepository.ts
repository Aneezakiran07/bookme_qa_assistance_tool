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
  created_by_avatar_id: string | null
  linked_test_cases_count: number
}

export const requirementRepository = {
  // moduleId narrows the list to one module, same filter the page's
  // module dropdown uses. left undefined this returns every active
  // (non archived) requirement across all modules.
  async list(projectId: number, moduleId?: number): Promise<RequirementWithMeta[]> {
    const sql = useDb()
    const rows = moduleId
      ? await sql`
          select
            r.*,
            m.name as module_name,
            u.email as created_by_email,
            u.avatar_id as created_by_avatar_id,
            coalesce(l.cnt, 0)::int as linked_test_cases_count
          from requirements r
          join modules m on m.id = r.module_id
          left join users u on u.id = r.created_by
          left join (
            select l.requirement_id, count(*) as cnt
            from requirement_test_case_links l
            join test_cases tc on tc.id = l.test_case_id
            where tc.archived = false
            group by l.requirement_id
          ) l on l.requirement_id = r.id
          where r.archived = false and r.project_id = ${projectId} and r.module_id = ${moduleId}
          order by r.created_at desc
        `
      : await sql`
          select
            r.*,
            m.name as module_name,
            u.email as created_by_email,
            u.avatar_id as created_by_avatar_id,
            coalesce(l.cnt, 0)::int as linked_test_cases_count
          from requirements r
          join modules m on m.id = r.module_id
          left join users u on u.id = r.created_by
          left join (
            select l.requirement_id, count(*) as cnt
            from requirement_test_case_links l
            join test_cases tc on tc.id = l.test_case_id
            where tc.archived = false
            group by l.requirement_id
          ) l on l.requirement_id = r.id
          where r.archived = false and r.project_id = ${projectId}
          order by r.created_at desc
        `
    return rows as RequirementWithMeta[]
  },

  async findById(projectId: number, id: number): Promise<RequirementRecord | null> {
    const sql = useDb()
    const rows = await sql`select * from requirements where id = ${id} and project_id = ${projectId}`
    return (rows[0] as RequirementRecord) ?? null
  },

  async create(projectId: number, input: {
    title: string
    moduleId: number
    targetRelease: string | null
    status: string
    description: string | null
    createdBy: number
  }): Promise<RequirementRecord> {
    const sql = useDb()
    const rows = await sql`
      insert into requirements (project_id, title, module_id, target_release, status, description, created_by)
      values (
        ${projectId},
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
    projectId: number,
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
    const current = await this.findById(projectId, id)
    if (!current) return null

    const rows = await sql`
      update requirements set
        title = ${patch.title ?? current.title},
        module_id = ${patch.moduleId ?? current.module_id},
        target_release = ${patch.targetRelease !== undefined ? patch.targetRelease : current.target_release},
        status = ${patch.status ?? current.status},
        description = ${patch.description !== undefined ? patch.description : current.description}
      where id = ${id} and project_id = ${projectId}
      returning *
    `
    return (rows[0] as RequirementRecord) ?? null
  },

  // soft delete only, matches the schema's archived flag. the row and
  // its links stay in place so history and reporting are not lost.
  // how many of the given requirement ids really belong to this project
  async countInProject(projectId: number, ids: number[]): Promise<number> {
    if (ids.length === 0) return 0
    const sql = useDb()
    const rows = await sql`
      select count(*)::int as cnt from requirements
      where project_id = ${projectId} and id = any(string_to_array(${ids.join(',')}, ',')::int[])
    `
    return (rows[0] as any).cnt as number
  },

  async archive(projectId: number, id: number): Promise<RequirementRecord | null> {
    const sql = useDb()
    const rows = await sql`
      update requirements set archived = true where id = ${id} and project_id = ${projectId}
      returning *
    `
    return (rows[0] as RequirementRecord) ?? null
  }
}
