import { useDb } from '../db/client'

export interface UserRecord {
  id: number
  firebase_uid: string
  email: string
  role: 'Admin' | 'QA Lead' | 'Tester' | 'Developer'
  active: boolean
  created_at: string
  display_name: string | null
  email_notifications: boolean
  daily_digest_enabled: boolean
  avatar_id: string
  invited_by: number | null
  invited_at: string | null
}

// this file is the only place that talks to the users table directly
// every other layer goes through these functions instead of writing SQL
export const userRepository = {
  async findByFirebaseUid(firebaseUid: string): Promise<UserRecord | null> {
    const sql = useDb()
    const rows = await sql`select * from users where firebase_uid = ${firebaseUid}`
    return (rows[0] as UserRecord) ?? null
  },

  async findByEmail(email: string): Promise<UserRecord | null> {
    const sql = useDb()
    const rows = await sql`select * from users where lower(email) = lower(${email})`
    return (rows[0] as UserRecord) ?? null
  },

  // used by both invite-accept paths (password and Google) once the
  // Firebase side is settled -- creates the app-side users row
  async createFromInvitation(fields: {
    firebaseUid: string
    email: string
    role: string
    invitedBy: number | null
    invitedAt: string
  }): Promise<UserRecord> {
    const sql = useDb()
    const rows = await sql`
      insert into users (firebase_uid, email, role, active, invited_by, invited_at)
      values (${fields.firebaseUid}, lower(${fields.email}), ${fields.role}, true, ${fields.invitedBy}, ${fields.invitedAt})
      returning *
    `
    return rows[0] as UserRecord
  },

  async approve(userId: number, role: string): Promise<UserRecord | null> {
    const sql = useDb()
    const rows = await sql`
      update users set role = ${role}, active = true where id = ${userId}
      returning *
    `
    return (rows[0] as UserRecord) ?? null
  },

  async findById(userId: number): Promise<UserRecord | null> {
    const sql = useDb()
    const rows = await sql`select * from users where id = ${userId}`
    return (rows[0] as UserRecord) ?? null
  },

  async listActive(): Promise<UserRecord[]> {
    const sql = useDb()
    const rows = await sql`select * from users where active = true order by email asc`
    return rows as UserRecord[]
  },

  // fetches every user for the admin page's two tables. users are no
  // longer scoped to specific modules -- module assignment was removed,
  // bug assignment (owner_id on bugs) is the only per-user scoping
  // concept left in the app -- so this is a plain listing with no module
  // join.
  async listAll(): Promise<UserRecord[]> {
    const sql = useDb()
    const rows = await sql`select * from users order by created_at asc`
    return rows as UserRecord[]
  },

  async setActive(userId: number, active: boolean): Promise<UserRecord> {
    const sql = useDb()
    const rows = await sql`
      update users set active = ${active} where id = ${userId}
      returning *
    `
    return rows[0] as UserRecord
  },

  // updates the editable fields on the profile page: display name and
  // the chosen avatar. notifications and the daily digest are on for
  // everyone by default now, so those aren't touched here. the caller
  // (the PUT handler) is responsible for merging in whichever field
  // wasn't sent, so both parameters here are always the final values to
  // write, never "leave as is" sentinels
  async updateProfile(
    userId: number,
    fields: { displayName: string | null; avatarId: string }
  ): Promise<UserRecord | null> {
    const sql = useDb()
    const rows = await sql`
      update users set
        display_name = ${fields.displayName},
        avatar_id = ${fields.avatarId}
      where id = ${userId}
      returning *
    `
    return (rows[0] as UserRecord) ?? null
  }
}