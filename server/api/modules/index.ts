import { moduleRepository } from '~~/server/repositories/moduleRepository'
import { requireRole } from '~~/server/utils/authorize'

// GET is intentionally open to every active user (not just Admin/QA Lead):
// ModuleSelect.vue and the Requirements/Test Cases/Bugs forms all need the
// full module list just to populate a dropdown, same as before this file
// grew a POST duplicate-check. Only the mutating verb is role-gated, in
// modules/[id].put.ts and modules/[id].delete.ts and below.
export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser

  if (event.method === 'GET') {
    return moduleRepository.list()
  }

  if (event.method === 'POST') {
    requireRole(event, ['Admin', 'QA Lead'])

    const body = await readBody<{ name: string }>(event)
    const name = body?.name?.trim()
    if (!name) {
      throw createError({ statusCode: 400, statusMessage: 'Module name is required' })
    }

    const existing = await moduleRepository.findByNameLower(name)
    if (existing) {
      throw createError({
        statusCode: 409,
        statusMessage: `A module named "${existing.name}" already exists.`
      })
    }

    return moduleRepository.create(name, currentUser.id)
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
