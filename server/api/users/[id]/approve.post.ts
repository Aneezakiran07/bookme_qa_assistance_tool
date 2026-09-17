import { requireRole } from '~~/server/utils/authorize'
import { userRepository } from '~~/server/repositories/userRepository'
const validRoles = ['Admin', 'QA Lead', 'Tester', 'Developer']

export default defineEventHandler(async (event) => {
  requireRole(event, ['Admin'])

  const userId = Number(getRouterParam(event, 'id'))
  if (!userId || Number.isNaN(userId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user id' })
  }

  const body = await readBody<{ role: string; moduleIds: number[] }>(event)

  if (!validRoles.includes(body.role)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid role' })
  }
  if (!body.moduleIds?.length) {
    throw createError({ statusCode: 400, statusMessage: 'At least one module is required' })
  }

  const user = await userRepository.approve(userId, body.role, body.moduleIds)
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }
  return user
})
