import { useDb } from '../db/client'

// the public user shape never includes password_hash, failed_login_attempts
// or locked_until, so a query that returns users to the browser can never
// leak them. every query in this file uses this one column list
const PUBLIC_COLUMNS = `
  id, email, role, active, created_at, display_name,
  email_notifications, daily_digest_enabled, avatar_id, invited_by,
  invited_at, last_login_at
`

export interface UserRecord {
  id: number
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
  last_login_at: string | null
}

// what the login route needs and nothing more
export interface UserAuthRecord {
  id: number
  email: string
  role: 'Admin' | 'QA Lead' | 'Tester' | 'Developer'
  active: boolean
  password_hash: string | null
  failed_login_attempts: number
  locked_until: string | null
}

const MAX_FAILED_ATTEMPTS = 5
const LOCK_MINUTES = 15

// this file is the only place that talks to the users table directly
// every other layer goes through these functions instead of writing SQL
export const userRepository = {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const sql = useDb()
    const rows = await sql(`select ${PUBLIC_COLUMNS} from users where lower(email) = lower($1)`, [email])
    return (rows[0] as UserRecord) ?? null
  },

  // the only query that reads the password hash, used by login alone
  async findAuthByEmail(email: string): Promise<UserAuthRecord | null> {
    const sql = useDb()
    const rows = await sql(
      `select id, email, role, active, password_hash, failed_login_attempts, locked_until
       from users where lower(email) = lower($1)`,
      [email]
    )
    return (rows[0] as UserAuthRecord) ?? null
  },

  // creates the app side users row when an invitee accepts and sets a password
  async createFromInvitation(fields: {
    email: string
    role: string
    invitedBy: number | null
    invitedAt: string
    passwordHash: string
  }): Promise<UserRecord> {
    const sql = useDb()
    const rows = await sql(
      `insert into users (email, role, active, invited_by, invited_at, password_hash)
       values (lower($1), $2, true, $3, $4, $5)
       returning ${PUBLIC_COLUMNS}`,
      [fields.email, fields.role, fields.invitedBy, fields.invitedAt, fields.passwordHash]
    )
    return rows[0] as UserRecord
  },

  // sets a new password and clears any lockout, used by the password reset
  async setPasswordHash(userId: number, hash: string): Promise<void> {
    const sql = useDb()
    await sql(
      `update users set password_hash = $1, failed_login_attempts = 0, locked_until = null
       where id = $2`,
      [hash, userId]
    )
  },

  async recordLoginSuccess(userId: number): Promise<UserRecord | null> {
    const sql = useDb()
    const rows = await sql(
      `update users set failed_login_attempts = 0, locked_until = null, last_login_at = now()
       where id = $1
       returning ${PUBLIC_COLUMNS}`,
      [userId]
    )
    return (rows[0] as UserRecord) ?? null
  },

  // counts the failure and locks the account after five in a row
  async recordLoginFailure(userId: number): Promise<void> {
    const sql = useDb()
    await sql(
      `update users set
         failed_login_attempts = case when failed_login_attempts + 1 >= $2 then 0 else failed_login_attempts + 1 end,
         locked_until = case when failed_login_attempts + 1 >= $2
                             then now() + ($3 || ' minutes')::interval
                             else locked_until end
       where id = $1`,
      [userId, MAX_FAILED_ATTEMPTS, String(LOCK_MINUTES)]
    )
  },

  async approve(userId: number, role: string): Promise<UserRecord | null> {
    const sql = useDb()
    const rows = await sql(
      `update users set role = $1, active = true where id = $2 returning ${PUBLIC_COLUMNS}`,
      [role, userId]
    )
    return (rows[0] as UserRecord) ?? null
  },

  async setRole(userId: number, role: string): Promise<UserRecord | null> {
    const sql = useDb()
    const rows = await sql(
      `update users set role = $1 where id = $2 returning ${PUBLIC_COLUMNS}`,
      [role, userId]
    )
    return (rows[0] as UserRecord) ?? null
  },

  // counts active people who can manage the team page, used to make sure
  // a role change or deactivation never leaves the app with nobody able
  // to invite or manage users
  async countActiveManagers(): Promise<number> {
    const sql = useDb()
    const rows = await sql`
      select count(*)::int as total from users
      where active = true and role in ('Admin', 'QA Lead')
    `
    return (rows[0] as { total: number }).total
  },

  async findById(userId: number): Promise<UserRecord | null> {
    const sql = useDb()
    const rows = await sql(`select ${PUBLIC_COLUMNS} from users where id = $1`, [userId])
    return (rows[0] as UserRecord) ?? null
  },

  async listActive(): Promise<UserRecord[]> {
    const sql = useDb()
    const rows = await sql(`select ${PUBLIC_COLUMNS} from users where active = true order by email asc`)
    return rows as UserRecord[]
  },

  // fetches every user for the admin page's two tables. users are no
  // longer scoped to specific modules -- module assignment was removed,
  // bug assignment (owner_id on bugs) is the only per-user scoping
  // concept left in the app -- so this is a plain listing with no module
  // join.
  async listAll(): Promise<UserRecord[]> {
    const sql = useDb()
    const rows = await sql(`select ${PUBLIC_COLUMNS} from users order by created_at asc`)
    return rows as UserRecord[]
  },

  async setActive(userId: number, active: boolean): Promise<UserRecord> {
    const sql = useDb()
    const rows = await sql(
      `update users set active = $1 where id = $2 returning ${PUBLIC_COLUMNS}`,
      [active, userId]
    )
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
    const rows = await sql(
      `update users set display_name = $1, avatar_id = $2 where id = $3 returning ${PUBLIC_COLUMNS}`,
      [fields.displayName, fields.avatarId, userId]
    )
    return (rows[0] as UserRecord) ?? null
  }
}
