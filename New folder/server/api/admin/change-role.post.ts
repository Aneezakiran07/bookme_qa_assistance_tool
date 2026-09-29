import { requireRole } from '~~/server/utils/authorize'
import { userRepository } from '~~/server/repositories/userRepository'

const validRoles = ['Admin', 'QA Lead', 'Tester', 'Developer']
const managerRoles = ['Admin', 'QA Lead']

// changes the role of an existing team member and nothing else. it does not
// touch the active flag, so it can never bring a deactivated user back.
// the session sync middleware picks up the new role on the person's next
// request, so the change takes effect right away
export default defineEventHandler(async (event) => {
  requireRole(event, ['Admin', 'QA Lead'])

  const body = await readBody<{ userId?: number; role?: string }>(event)

  const userId = Number(body?.userId)
  if (!Number.isInteger(userId) || userId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'A valid userId is required' })
  }
  if (!body?.role || !validRoles.includes(body.role)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid role' })
  }

  const target = await userRepository.findById(userId)
  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }
  if (target.role === body.role) {
    return { success: true, user: target }
  }

  // the last active Admin or QA Lead cannot be moved to a role that loses
  // access to the team page
  const losesManagerAccess = managerRoles.includes(target.role) && !managerRoles.includes(body.role)
  if (target.active && losesManagerAccess && (await userRepository.countActiveManagers()) <= 1) {
    throw createError({
      statusCode: 409,
      statusMessage: 'This is the last active Admin or QA Lead, so their role cannot be changed'
    })
  }

  const user = await userRepository.setRole(userId, body.role)
  return { success: true, user }
})
