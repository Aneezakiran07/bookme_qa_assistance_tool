import { requireRole } from '~~/server/utils/authorize'
import { userRepository } from '~~/server/repositories/userRepository'

// turns a deactivated team member back on. their password, role and history
// were never removed, so they can sign in again right away
export default defineEventHandler(async (event) => {
  requireRole(event, ['Admin', 'QA Lead'])

  const body = await readBody<{ userId?: number }>(event)
  const userId = Number(body?.userId)
  if (!Number.isInteger(userId) || userId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'A valid userId is required' })
  }

  const target = await userRepository.findById(userId)
  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }
  if (target.active) {
    return { success: true, user: target }
  }

  const user = await userRepository.setActive(userId, true)
  return { success: true, user }
})
