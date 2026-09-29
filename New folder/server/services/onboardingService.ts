import { useDb } from '../db/client'
import { userRepository, type UserRecord } from '../repositories/userRepository'
import { invitationRepository } from '../repositories/invitationRepository'

// this service owns the one rule that matters on login
// look the user up by their stable firebase uid first
// fall back to email to catch a user row that has no uid yet, in which
// case the uid gets backfilled onto that existing row
// if there is still no row, check for a live invitation for that email
// a verified firebase login proves the person owns the email, so the
// invitation can be finished right here. this means the invitee does not
// have to click the continue button on the firebase page for their
// account to work
// if there is no row and no live invitation, the person was never
// invited and login is refused
export const onboardingService = {
  async resolveLogin(
    firebaseUid: string,
    rawEmail: string,
    emailVerified: boolean
  ): Promise<UserRecord> {
    const email = rawEmail.toLowerCase()

    const byUid = await userRepository.findByFirebaseUid(firebaseUid)
    if (byUid) return byUid

    const byEmail = await userRepository.findByEmail(email)
    if (byEmail) {
      // linking a firebase account to an existing row proves nothing unless
      // firebase confirmed the person owns this email address
      if (!emailVerified) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Please verify your email address before signing in.'
        })
      }

      // a row that already belongs to a different firebase account is never
      // taken over, an admin has to sort that out
      if (byEmail.firebase_uid) {
        throw createError({
          statusCode: 403,
          statusMessage: 'This email is linked to a different sign in. Please contact an admin.'
        })
      }

      // the extra condition in the where clause means two logins at the same
      // moment cannot both claim the row
      const sql = useDb()
      const rows = await sql`
        update users set firebase_uid = ${firebaseUid}
        where id = ${byEmail.id} and firebase_uid is null
        returning *
      `
      if (!rows[0]) {
        throw createError({ statusCode: 409, statusMessage: 'Please try signing in again.' })
      }
      return rows[0] as UserRecord
    }

    // only trust the email when firebase says it is verified. finishing a
    // password reset or signing in with google both mark it verified
    const invitation = emailVerified ? await invitationRepository.findActiveByEmail(email) : null
    const invitationIsLive =
      !!invitation && new Date(invitation.expires_at).getTime() > Date.now()

    if (invitation && invitationIsLive) {
      let created: UserRecord
      try {
        created = await userRepository.createFromInvitation({
          firebaseUid,
          email,
          role: invitation.role,
          invitedBy: invitation.invited_by,
          invitedAt: invitation.created_at
        })
      } catch (error) {
        // two logins at the same moment can race to create the same row,
        // so look again before giving up
        const existing = await userRepository.findByEmail(email)
        if (!existing) throw error
        return existing
      }
      await invitationRepository.markAccepted(invitation.id)
      return created
    }

    throw createError({ statusCode: 403, statusMessage: 'You have not been invited to this app.' })
  }
}
