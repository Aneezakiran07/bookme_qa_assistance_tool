import { requireRole } from '~~/server/utils/authorize'
import { invitationRepository } from '~~/server/repositories/invitationRepository'
import { sendInviteEmail } from '~~/server/utils/email'

// sends the same invite link again for an invite that is still outstanding
export default defineEventHandler(async (event) => {
  requireRole(event, ['Admin', 'QA Lead'])

  const id = Number(getRouterParam(event, 'id'))
  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid invitation id' })
  }

  const invitation = await invitationRepository.findById(id)
  const isUsable =
    invitation &&
    !invitation.accepted_at &&
    !invitation.revoked_at &&
    new Date(invitation.expires_at).getTime() > Date.now()

  if (!invitation || !isUsable) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation not found or no longer valid' })
  }

  const config = useRuntimeConfig()
  const emailSent = await sendInviteEmail(
    invitation.email,
    `${config.public.appUrl}/accept-invite?token=${invitation.token}`
  )

  return { emailSent }
})
