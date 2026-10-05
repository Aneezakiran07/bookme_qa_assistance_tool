import { useDb } from '../db/client'

export interface PasswordResetRecord {
  id: number
  user_id: number
  token_hash: string
  created_at: string
  expires_at: string
  used_at: string | null
}

// this file is the only place that talks to the password_resets table
// only the sha256 hash of a token is ever stored, never the token itself
export const passwordResetRepository = {
  async countRecentForUser(userId: number, minutes: number): Promise<number> {
    const sql = useDb()
    const rows = await sql(
      `select count(*)::int as total from password_resets
       where user_id = $1 and created_at > now() - ($2 || ' minutes')::interval`,
      [userId, String(minutes)]
    )
    return (rows[0] as { total: number }).total
  },

  // earlier unused links stop working as soon as a newer one is requested
  async markOpenAsUsedForUser(userId: number): Promise<void> {
    const sql = useDb()
    await sql`update password_resets set used_at = now() where user_id = ${userId} and used_at is null`
  },

  async create(fields: { userId: number; tokenHash: string; expiresAt: Date }): Promise<void> {
    const sql = useDb()
    await sql`
      insert into password_resets (user_id, token_hash, expires_at)
      values (${fields.userId}, ${fields.tokenHash}, ${fields.expiresAt.toISOString()})
    `
  },

  // returns the row only when it is unused and not expired
  async findValidByHash(tokenHash: string): Promise<PasswordResetRecord | null> {
    const sql = useDb()
    const rows = await sql`
      select * from password_resets
      where token_hash = ${tokenHash} and used_at is null and expires_at > now()
    `
    return (rows[0] as PasswordResetRecord) ?? null
  },

  // conditional update so a link can only be used once even under a race
  async markUsedIfOpen(id: number): Promise<boolean> {
    const sql = useDb()
    const rows = await sql`
      update password_resets set used_at = now()
      where id = ${id} and used_at is null and expires_at > now()
      returning id
    `
    return rows.length > 0
  }
}
