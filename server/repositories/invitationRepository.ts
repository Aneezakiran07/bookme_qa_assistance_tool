import { useDb } from '../db/client'

export interface InvitationRecord {
  id: number
  email: string
  role: 'Admin' | 'QA Lead' | 'Tester' | 'Developer'
  token: string
  invited_by: number | null
  created_at: string
  expires_at: string
  accepted_at: string | null
  revoked_at: string | null
}

export interface OutstandingInvitationRecord extends InvitationRecord {
  invited_by_email: string | null
}

// this file is the only place that talks to the invitations table
// directly -- every other layer goes through these functions instead of
// writing SQL
export const invitationRepository = {
  async create(fields: {
    email: string
    role: string
    token: string
    invitedBy: number
    expiresAt: Date
  }): Promise<InvitationRecord> {
    const sql = useDb()
    const rows = await sql`
      insert into invitations (email, role, token, invited_by, expires_at)
      values (lower(${fields.email}), ${fields.role}, ${fields.token}, ${fields.invitedBy}, ${fields.expiresAt.toISOString()})
      returning *
    `
    return rows[0] as InvitationRecord
  },

  async findByToken(token: string): Promise<InvitationRecord | null> {
    const sql = useDb()
    const rows = await sql`select * from invitations where token = ${token}`
    return (rows[0] as InvitationRecord) ?? null
  },

  // outstanding = not yet accepted and not revoked, regardless of whether
  // it has expired -- callers that care about expiry check expires_at
  // themselves (see validate.get.ts)
  async findActiveByEmail(email: string): Promise<InvitationRecord | null> {
    const sql = useDb()
    const rows = await sql`
      select * from invitations
      where lower(email) = lower(${email})
        and accepted_at is null
        and revoked_at is null
    `
    return (rows[0] as InvitationRecord) ?? null
  },

  // joined with the inviter's email for display on the admin page
  async listOutstanding(): Promise<OutstandingInvitationRecord[]> {
    const sql = useDb()
    const rows = await sql`
      select invitations.*, inviter.email as invited_by_email
      from invitations
      left join users inviter on inviter.id = invitations.invited_by
      where invitations.accepted_at is null and invitations.revoked_at is null
      order by invitations.created_at desc
    `
    return rows as OutstandingInvitationRecord[]
  },

  async markAccepted(id: number): Promise<InvitationRecord> {
    const sql = useDb()
    const rows = await sql`
      update invitations set accepted_at = now() where id = ${id}
      returning *
    `
    return rows[0] as InvitationRecord
  },

  async revoke(id: number): Promise<InvitationRecord | null> {
    const sql = useDb()
    const rows = await sql`
      update invitations set revoked_at = now() where id = ${id}
      returning *
    `
    return (rows[0] as InvitationRecord) ?? null
  }
}
