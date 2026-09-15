import { useDb } from '../db/client'
import { userRepository, type UserRecord } from '../repositories/userRepository'

// this service owns the one rule that matters on first login
// look the user up by their stable firebase uid first
// fall back to email only to catch a user row that predates the uid column,
// in which case the uid gets backfilled onto that existing row
// if neither matches, this is a brand new user, create it as pending
export const onboardingService = {
  async resolveLogin(firebaseUid: string, rawEmail: string): Promise<UserRecord> {
    const email = rawEmail.toLowerCase()

    const byUid = await userRepository.findByFirebaseUid(firebaseUid)
    if (byUid) return byUid

    const byEmail = await userRepository.findByEmail(email)
    if (byEmail) {
      const sql = useDb()
      const rows = await sql`
        update users set firebase_uid = ${firebaseUid} where id = ${byEmail.id}
        returning *
      `
      return rows[0] as UserRecord
    }

    return userRepository.createPending(firebaseUid, email)
  }
}
