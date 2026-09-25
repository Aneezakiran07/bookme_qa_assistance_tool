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

// public -- invitee sets a password to accept the invite
export default defineEventHandler(async (event) => {
  const body = await readBody<{ token?: string; password?: string }>(event)

  if (!body?.token) {
    throw createError({ statusCode: 400, statusMessage: 'Missing token' })
  }
  if (!body?.password || body.password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 8 characters' })
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
    console.error('[invitations/accept] getUserByEmail failed:', error)
    throw createError({ statusCode: 500, statusMessage: 'Could not find the invited Firebase account' })
  }

  try {
    await firebaseAuth.updateUser(firebaseUser.uid, { password: body.password })
  } catch (error) {
    console.error('[invitations/accept] updateUser failed:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to set password' })
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
