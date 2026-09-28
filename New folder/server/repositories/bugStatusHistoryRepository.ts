import { useDb } from '../db/client'

export const bugStatusHistoryRepository = {
  async create(input: {
    bugId: number
    oldStatus: string | null
    newStatus: string
    changedBy: number | null
  }) {
    const sql = useDb()
    const rows = await sql`
      insert into bug_status_history (bug_id, old_status, new_status, changed_by)
      values (${input.bugId}, ${input.oldStatus}, ${input.newStatus}, ${input.changedBy})
      returning *
    `
    return rows[0]
  },

  // joined with the user email so the audit timeline can show who made
  // each transition without a second round trip
  async listByBug(bugId: number) {
    const sql = useDb()
    const rows = await sql`
      select
        h.*,
        u.email as changed_by_email
      from bug_status_history h
      left join users u on u.id = h.changed_by
      where h.bug_id = ${bugId}
      order by h.changed_at asc
    `
    return rows
  }
}
