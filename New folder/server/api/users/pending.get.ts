import { requireRole } from '~~/server/utils/authorize'
import { userRepository } from '~~/server/repositories/userRepository'
export default defineEventHandler(async (event) => {
  requireRole(event, ['Admin', 'QA Lead'])
  return userRepository.listPending()
})
