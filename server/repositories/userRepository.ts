import { useDb } from '../db/client'

export interface UserRecord {
  id: number
  firebase_uid: string
  email: string
  role: 'Pending' | 'Admin' | 'QA Lead' | 'Tester' | 'Developer'
  active: boolean
  created_at: string
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

  async createPending(firebaseUid: string, email: string): Promise<UserRecord> {
    const sql = useDb()
    const rows = await sql`
      insert into users (firebase_uid, email, role, active)
      values (${firebaseUid}, lower(${email}), 'Pending', false)
      returning *
    `
    return rows[0] as UserRecord
  },

  async listPending(): Promise<UserRecord[]> {
    const sql = useDb()
    const rows = await sql`select * from users where role = 'Pending' order by created_at asc`
    return rows as UserRecord[]
  },

  async approve(userId: number, role: string, moduleIds: number[]): Promise<UserRecord | null> {
    const sql = useDb()
    const rows = await sql`
      update users set role = ${role}, active = true where id = ${userId}
      returning *
    `
    if (!rows[0]) return null
    await this.setModules(userId, moduleIds)
    return rows[0] as UserRecord
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

  // pending approvals means role is still Pending, or an admin flipped
  // active back to false on someone who already had a real role
  async listPendingOrInactive(): Promise<UserRecord[]> {
    const sql = useDb()
    const rows = await sql`
      select * from users
      where role = 'Pending' or active = false
      order by created_at asc
    `
    return rows as UserRecord[]
  },

  // fetches every user together with the names of the modules they are
  // scoped to, one row per user with modules collapsed into a json array,
  // so the admin page can show module chips without a second round trip
  async listAllWithModules(): Promise<(UserRecord & { modules: { id: number; name: string }[] })[]> {
    const sql = useDb()
    const rows = await sql`
      select
        u.*,
        coalesce(
          json_agg(
            json_build_object('id', m.id, 'name', m.name)
          ) filter (where m.id is not null),
          '[]'
        ) as modules
      from users u
      left join user_modules um on um.user_id = u.id
      left join modules m on m.id = um.module_id
      group by u.id
      order by u.created_at asc
    `
    return rows as (UserRecord & { modules: { id: number; name: string }[] })[]
  },

  // replaces a user's module scope entirely rather than only adding to it,
  // so editing an active user's modules removes ones that were unchecked
  async setModules(userId: number, moduleIds: number[]): Promise<void> {
    const sql = useDb()
    await sql`delete from user_modules where user_id = ${userId}`
    for (const moduleId of moduleIds) {
      await sql`
        insert into user_modules (user_id, module_id)
        values (${userId}, ${moduleId})
        on conflict do nothing
      `
    }
  },

  // used by the dashboard's module filter to default to "my modules"
  // instead of showing org-wide data the moment someone logs in
  async listModuleIdsForUser(userId: number): Promise<number[]> {
    const sql = useDb()
    const rows = await sql`select module_id from user_modules where user_id = ${userId}`
    return rows.map((r: any) => r.module_id)
  },

  async setActive(userId: number, active: boolean): Promise<UserRecord> {
    const sql = useDb()
    const rows = await sql`
      update users set active = ${active} where id = ${userId}
      returning *
    `
    return rows[0] as UserRecord
  }
}
