import { requireRole } from '~~/server/utils/authorize'
import { userRepository } from '~~/server/repositories/userRepository'

const validRoles = ['Admin', 'QA Lead', 'Tester', 'Developer']

// used both to activate a brand new pending user and to change an already
// active user's role or module scope, the update is the same either way.
// Admin and QA Lead both get full access here (same tier, two labels) --
// including being able to assign any role, Admin included, same as
// Admin always could.
export default defineEventHandler(async (event) => {
  requireRole(event, ['Admin', 'QA Lead'])

  const body = await readBody<{ userId: number; role: string; moduleIds: number[] }>(event)

  if (!body?.userId) {
    throw createError({ statusCode: 400, statusMessage: 'userId is required' })
  }
  if (!validRoles.includes(body.role)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid role' })
  }

  const user = await userRepository.approve(body.userId, body.role, body.moduleIds ?? [])
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }
  return { success: true, user }
})
