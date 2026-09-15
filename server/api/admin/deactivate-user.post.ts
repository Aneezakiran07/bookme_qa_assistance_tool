import { requireRole } from '~~/server/utils/authorize'
import { userRepository } from '~~/server/repositories/userRepository'

// flips a team member back to inactive, this does not delete the row or
// their history, they just fail the requireApprovedUser check going forward
export default defineEventHandler(async (event) => {
  requireRole(event, ['Admin'])

  const body = await readBody<{ userId: number }>(event)
  if (!body?.userId) {
    throw createError({ statusCode: 400, statusMessage: 'userId is required' })
  }

  const user = await userRepository.setActive(body.userId, false)
  return { success: true, user }
})
