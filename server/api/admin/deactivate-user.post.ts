import { requireRole } from '~~/server/utils/authorize'
import { userRepository } from '~~/server/repositories/userRepository'

const managerRoles = ['Admin', 'QA Lead']

// flips a team member back to inactive, this does not delete the row or
// their history, they just fail the requireApprovedUser check going
// forward. Admin and QA Lead both get this (same tier, two labels).
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
  if (!target.active) {
    return { success: true, user: target }
  }

  // the last active Admin or QA Lead cannot be deactivated, otherwise
  // nobody would be left who can invite or manage people
  if (managerRoles.includes(target.role) && (await userRepository.countActiveManagers()) <= 1) {
    throw createError({
      statusCode: 409,
      statusMessage: 'This is the last active Admin or QA Lead, so they cannot be deactivated'
    })
  }

  const user = await userRepository.setActive(userId, false)
  return { success: true, user }
})
