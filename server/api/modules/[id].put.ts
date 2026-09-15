import { moduleRepository } from '~~/server/repositories/moduleRepository'
import { requireRole } from '~~/server/utils/authorize'

// renames a module. same case-insensitive duplicate check as create,
// but excludes the module's own row so saving a name unchanged (or only
// changed in casing) doesn't trip over itself.
export default defineEventHandler(async (event) => {
  requireRole(event, ['Admin', 'QA Lead'])

  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid module id' })
  }

  const body = await readBody<{ name: string }>(event)
  const name = body?.name?.trim()
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Module name is required' })
  }

  const current = await moduleRepository.findById(id)
  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Module not found' })
  }

  const existing = await moduleRepository.findByNameLower(name, id)
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: `A module named "${existing.name}" already exists.`
    })
  }

  return moduleRepository.update(id, name)
})
