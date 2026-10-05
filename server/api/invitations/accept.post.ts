import { invitationRepository } from '~~/server/repositories/invitationRepository'
import { userRepository } from '~~/server/repositories/userRepository'
import { assertPasswordRules, hashPassword } from '~~/server/utils/password'

// public. the invitee sets a password to accept the invite, the account is
// created and the person is signed in straight away
export default defineEventHandler(async (event) => {
  const body = await readBody<{ token?: string; password?: string }>(event)

  if (!body?.token || typeof body.token !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing token' })
  }
  assertPasswordRules(body.password)

  const invitation = await invitationRepository.findByToken(body.token)
  const isUsable =
    invitation &&
    !invitation.accepted_at &&
    !invitation.revoked_at &&
    new Date(invitation.expires_at).getTime() > Date.now()

  if (!invitation || !isUsable) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation not found or no longer valid' })
  }

  const existing = await userRepository.findByEmail(invitation.email)
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'This email already has an account' })
  }

  const passwordHash = await hashPassword(body.password)

  // the conditional update means two requests at the same moment cannot both accept
  const claimed = await invitationRepository.markAcceptedIfOpen(invitation.id)
  if (!claimed) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation not found or no longer valid' })
  }

  let user
  try {
    user = await userRepository.createFromInvitation({
      email: invitation.email,
      role: invitation.role,
      invitedBy: invitation.invited_by,
      invitedAt: invitation.created_at,
      passwordHash
    })
  } catch (error) {
    // the row could not be created, so the invite goes back to being usable
    console.error('[invitations/accept] could not create the user:', error)
    await invitationRepository.reopen(invitation.id)
    throw createError({ statusCode: 409, statusMessage: 'This email already has an account' })
  }

  await setUserSession(event, {
    user: { id: user.id, email: user.email, role: user.role, active: user.active }
  })

  return user
})
