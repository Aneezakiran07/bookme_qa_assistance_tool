import { useFirebaseAuth } from '~~/server/utils/firebaseAdmin'
import { invitationRepository, type InvitationRecord } from '~~/server/repositories/invitationRepository'
import { userRepository } from '~~/server/repositories/userRepository'

function isUsable(invitation: InvitationRecord | null): invitation is InvitationRecord {
  return (
    !!invitation &&
    !invitation.accepted_at &&
    !invitation.revoked_at &&
    new Date(invitation.expires_at).getTime() > Date.now()
  )
}

// public. the invitee already set their password on the auth action page
// using firebase's own client side reset flow, so this route never
// touches a password. it only creates the matching row in this app's own
// users table and marks the invitation as accepted, which is the step
// that was missing when people landed on a firebase owned page instead
// of this app
export default defineEventHandler(async (event) => {
  const body = await readBody<{ token?: string }>(event)

  if (!body?.token) {
    throw createError({ statusCode: 400, statusMessage: 'Missing token' })
  }

  const invitation = await invitationRepository.findByToken(body.token)
  if (!isUsable(invitation)) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation not found or no longer valid' })
  }

  const firebaseAuth = useFirebaseAuth()

  let firebaseUser
  try {
    firebaseUser = await firebaseAuth.getUserByEmail(invitation.email)
  } catch (error) {
    console.error('[invitations/finalize] getUserByEmail failed:', error)
    throw createError({ statusCode: 500, statusMessage: 'Could not find the invited Firebase account' })
  }

  // the admin sdk only returns a passwordHash once a password has
  // actually been set on the account. the invited user was created with
  // no password at all, so this being empty means nobody has completed
  // the password reset step yet. this stops someone from calling this
  // route straight from the invite email before ever touching firebase's
  // own reset page, which would otherwise activate the account with no
  // password on it at all
  if (!firebaseUser.passwordHash) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please set your password using the link in your invite email first'
    })
  }

  const user = await userRepository.createFromInvitation({
    firebaseUid: firebaseUser.uid,
    email: invitation.email,
    role: invitation.role,
    invitedBy: invitation.invited_by,
    invitedAt: invitation.created_at
  })

  await invitationRepository.markAccepted(invitation.id)

  return user
})
