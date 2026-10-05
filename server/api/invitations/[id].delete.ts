import { requireRole } from '~~/server/utils/authorize'
import { invitationRepository } from '~~/server/repositories/invitationRepository'

// revokes the invitation row only, the invite link stops working right away
export default defineEventHandler(async (event) => {
  requireRole(event, ['Admin', 'QA Lead'])

  const id = Number(getRouterParam(event, 'id'))
  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid invitation id' })
  }

  const invitation = await invitationRepository.revoke(id)
  if (!invitation) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation not found' })
  }
  return { success: true, invitation }
})
