import { useDb } from '../db/client'

export const bugAssignmentLogRepository = {
  async create(input: {
    bugId: number
    assignedTo: number
    assignedBy: number | null
    severityAtAssignment: string | null
  }) {
    const sql = useDb()
    const rows = await sql`
      insert into bug_assignment_log (bug_id, assigned_to, assigned_by, severity_at_assignment)
      values (${input.bugId}, ${input.assignedTo}, ${input.assignedBy}, ${input.severityAtAssignment})
      returning *
    `
    return rows[0]
  },

  // joined with user emails so the audit timeline never needs a second
  // round trip to resolve who assigned the bug and who it went to
  async listByBug(bugId: number) {
    const sql = useDb()
    const rows = await sql`
      select
        l.*,
        assignee.email as assigned_to_email,
        assignee.avatar_id as assigned_to_avatar_id,
        assigner.email as assigned_by_email,
        assigner.avatar_id as assigned_by_avatar_id
      from bug_assignment_log l
      left join users assignee on assignee.id = l.assigned_to
      left join users assigner on assigner.id = l.assigned_by
      where l.bug_id = ${bugId}
      order by l.assigned_at asc
    `
    return rows
  }
}
