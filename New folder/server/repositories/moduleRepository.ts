import { useDb } from '../db/client'

export interface ModuleRecord {
  id: number
  name: string
  created_by: number | null
  created_at: string
  archived: boolean
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
  // only active (non-archived) modules -- an archived module drops out
  // of every "Filter by Module" dropdown and the App Map table, same as
  // an archived requirement or test case drops out of their own lists.
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
        select module_id, count(*) as cnt from requirements where archived = false group by module_id
      ) r on r.module_id = m.id
      left join (
        select module_id, count(*) as cnt from test_cases where archived = false group by module_id
      ) t on t.module_id = m.id
      where m.archived = false
      order by m.name asc
    `
    return rows as ModuleWithMeta[]
  },

  // case-insensitive lookup used both for the "is this name already
  // taken" pre-check on create/update and for the frontend's real-time
  // validation call. excludeId lets an edit ignore the module's own row
  // when checking its own (possibly unchanged) name against itself.
  // Only checks active modules -- an archived module's old name is free
  // to reuse, matching the partial unique index in the schema.
  async findByNameLower(name: string, excludeId?: number): Promise<ModuleRecord | null> {
    const sql = useDb()
    const rows = excludeId
      ? await sql`select * from modules where lower(name) = lower(${name}) and archived = false and id != ${excludeId}`
      : await sql`select * from modules where lower(name) = lower(${name}) and archived = false`
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
  // existing row back. the where clause mirrors the partial unique
  // index so Postgres can actually use it as the conflict target.
  async create(name: string, createdBy: number): Promise<ModuleRecord> {
    const sql = useDb()
    const rows = await sql`
      insert into modules (name, created_by)
      values (${name}, ${createdBy})
      on conflict (lower(name)) where archived = false do nothing
      returning *
    `
    if (rows[0]) return rows[0] as ModuleRecord
    const existing = await sql`select * from modules where lower(name) = lower(${name}) and archived = false`
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

  // used before a delete to decide whether to block it: a module still
  // in use by any *active* requirement or test case can't be archived
  // out from under them without those pages losing their module filter
  // option while still tagged to it. Archived (soft-deleted)
  // requirements/test cases are excluded -- they're no longer "linked"
  // from the user's point of view, and since the module row is never
  // physically removed (see archive() below), their still pointing at
  // it in the DB is never a problem.
  async countLinkedItems(id: number): Promise<{ requirements: number; testCases: number }> {
    const sql = useDb()
    const [reqRows, tcRows] = await Promise.all([
      sql`select count(*)::int as cnt from requirements where module_id = ${id} and archived = false`,
      sql`select count(*)::int as cnt from test_cases where module_id = ${id} and archived = false`
    ])
    return {
      requirements: reqRows[0]?.cnt ?? 0,
      testCases: tcRows[0]?.cnt ?? 0
    }
  },

  // soft delete only. requirements.module_id / test_cases.module_id are
  // `not null references modules(id)` with no cascade, so a module that
  // anything has EVER pointed at -- even a long-archived, historical row
  // kept only for its execution history -- can never really be hard
  // deleted anyway. Flipping archived instead sidesteps that for good:
  // the row (and everything that still legitimately references it)
  // stays put, it just disappears from every list and dropdown.
  async archive(id: number): Promise<ModuleRecord | null> {
    const sql = useDb()
    const rows = await sql`
      update modules set archived = true where id = ${id}
      returning *
    `
    return (rows[0] as ModuleRecord) ?? null
  }
}
