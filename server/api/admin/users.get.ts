import { requireRole } from '~~/server/utils/authorize'
import { userRepository } from '~~/server/repositories/userRepository'

// single call the admin page uses to render both tables, splitting the
// same joined dataset in memory instead of running two separate queries.
// Admin and QA Lead both get this (same tier, two labels).
export default defineEventHandler(async (event) => {
  requireRole(event, ['Admin', 'QA Lead'])

  const users = await userRepository.listAll()

  const pending = users.filter((u) => u.role === 'Pending' || !u.active)
  const active = users.filter((u) => u.active && u.role !== 'Pending')

  return { pending, active }
})