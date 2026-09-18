import { requireRole } from '~~/server/utils/authorize'
import { userRepository } from '~~/server/repositories/userRepository'

// flips a team member back to inactive, this does not delete the row or
// their history, they just fail the requireApprovedUser check going
// forward. Admin and QA Lead both get this (same tier, two labels).
export default defineEventHandler(async (event) => {
  requireRole(event, ['Admin', 'QA Lead'])

  const body = await readBody<{ userId: number }>(event)
  if (!body?.userId) {
    throw createError({ statusCode: 400, statusMessage: 'userId is required' })
  }

  const user = await userRepository.setActive(body.userId, false)
  return { success: true, user }
})
