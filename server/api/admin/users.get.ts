import { requireRole } from '~~/server/utils/authorize'
import { userRepository } from '~~/server/repositories/userRepository'

// single call the admin page uses to render both tables, splitting the
// same joined dataset in memory instead of running two separate queries
export default defineEventHandler(async (event) => {
  requireRole(event, ['Admin'])

  const users = await userRepository.listAllWithModules()

  const pending = users.filter((u) => u.role === 'Pending' || !u.active)
  const active = users.filter((u) => u.active && u.role !== 'Pending')

  return { pending, active }
})
