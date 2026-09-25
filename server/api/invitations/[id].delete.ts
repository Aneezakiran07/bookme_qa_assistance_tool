import { requireRole } from '~~/server/utils/authorize'
import { invitationRepository } from '~~/server/repositories/invitationRepository'

// revokes the invitation row only -- does not delete the Firebase user,
// since deciding what to do with an orphaned Firebase account is a
// separate concern from "this invite is no longer valid"
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
