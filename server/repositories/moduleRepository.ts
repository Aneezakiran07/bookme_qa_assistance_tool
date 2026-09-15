import { useDb } from '../db/client'

export interface ModuleRecord {
  id: number
  name: string
  created_by: number | null
  created_at: string
}

// same shape as ModuleRecord plus everything the App Map table needs to
// render in one request: creator's email (schema has no display-name
// column, same convention as admin/users.vue) and how many requirements /
// test cases currently point at this module, so "Linked Items" and the
// delete-block check never need a second round trip.
export interface ModuleWithMeta extends ModuleRecord {
  created_by_email: string | null
  requirements_count: number
  test_cases_count: number
}

export const moduleRepository = {
  async list(): Promise<ModuleWithMeta[]> {
    const sql = useDb()
    const rows = await sql`
      select
        m.*,
        u.email as created_by_email,
        coalesce(r.cnt, 0)::int as requirements_count,
        coalesce(t.cnt, 0)::int as test_cases_count
      from modules m
      left join users u on u.id = m.created_by
      left join (
        select module_id, count(*) as cnt from requirements group by module_id
      ) r on r.module_id = m.id
      left join (
        select module_id, count(*) as cnt from test_cases group by module_id
      ) t on t.module_id = m.id
      order by m.name asc
    `
    return rows as ModuleWithMeta[]
  },

  // case-insensitive lookup used both for the "is this name already
  // taken" pre-check on create/update and for the frontend's real-time
  // validation call. excludeId lets an edit ignore the module's own row
  // when checking its own (possibly unchanged) name against itself.
  async findByNameLower(name: string, excludeId?: number): Promise<ModuleRecord | null> {
    const sql = useDb()
    const rows = excludeId
      ? await sql`select * from modules where lower(name) = lower(${name}) and id != ${excludeId}`
      : await sql`select * from modules where lower(name) = lower(${name})`
    return (rows[0] as ModuleRecord) ?? null
  },

  async findById(id: number): Promise<ModuleRecord | null> {
    const sql = useDb()
    const rows = await sql`select * from modules where id = ${id}`
    return (rows[0] as ModuleRecord) ?? null
  },

  // kept intentionally tolerant (on-conflict-do-nothing, then re-select)
  // because ModuleSelect.vue relies on this for a low-friction inline
  // "create the module I just typed" flow elsewhere in the app. the
  // App Map page does its own explicit duplicate check before calling
  // this, so it gets a proper 409 instead of silently getting the
  // existing row back.
  async create(name: string, createdBy: number): Promise<ModuleRecord> {
    const sql = useDb()
    const rows = await sql`
      insert into modules (name, created_by)
      values (${name}, ${createdBy})
      on conflict (lower(name)) do nothing
      returning *
    `
    if (rows[0]) return rows[0] as ModuleRecord
    const existing = await sql`select * from modules where lower(name) = lower(${name})`
    return existing[0] as ModuleRecord
  },

  async update(id: number, name: string): Promise<ModuleRecord | null> {
    const sql = useDb()
    const rows = await sql`
      update modules set name = ${name} where id = ${id}
      returning *
    `
    return (rows[0] as ModuleRecord) ?? null
  },

  // used before a delete to decide whether to block it: a module wired
  // into any requirement or test case can't be removed without orphaning
  // those rows (both tables have module_id as `not null references`).
  async countLinkedItems(id: number): Promise<{ requirements: number; testCases: number }> {
    const sql = useDb()
    const [reqRows, tcRows] = await Promise.all([
      sql`select count(*)::int as cnt from requirements where module_id = ${id}`,
      sql`select count(*)::int as cnt from test_cases where module_id = ${id}`
    ])
    return {
      requirements: reqRows[0]?.cnt ?? 0,
      testCases: tcRows[0]?.cnt ?? 0
    }
  },

  async delete(id: number): Promise<ModuleRecord | null> {
    const sql = useDb()
    const rows = await sql`delete from modules where id = ${id} returning *`
    return (rows[0] as ModuleRecord) ?? null
  }
}
