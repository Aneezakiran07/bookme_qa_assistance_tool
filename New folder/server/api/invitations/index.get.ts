import { requireRole } from '~~/server/utils/authorize'
import { invitationRepository } from '~~/server/repositories/invitationRepository'

export default defineEventHandler(async (event) => {
  requireRole(event, ['Admin', 'QA Lead'])
  return invitationRepository.listOutstanding()
})
