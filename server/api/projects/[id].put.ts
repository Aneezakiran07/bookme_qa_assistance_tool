import { projectRepository } from '~~/server/repositories/projectRepository'
import { requireRole } from '~~/server/utils/authorize'

// renames a project, edits its description, or archives and unarchives it
// the slug is never touched here so links to the project never break
export default defineEventHandler(async (event) => {
  requireRole(event, ['Admin', 'QA Lead'])

  const id = Number(getRouterParam(event, 'id'))
  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid project id' })
  }

  const current = await projectRepository.findById(id)
  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  const body = await readBody<{
    name?: string
    description?: string | null
    archived?: boolean
  }>(event)

  const name = body?.name !== undefined ? (typeof body.name === 'string' ? body.name.trim() : '') : undefined
  if (name !== undefined && !name) {
    throw createError({ statusCode: 400, statusMessage: 'Project name cannot be empty' })
  }
  if (body?.description !== undefined && body.description !== null && typeof body.description !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Description must be text' })
  }
  if (body?.archived !== undefined && typeof body.archived !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'Archived must be true or false' })
  }

  // the name only has to be unique among active projects, so check it whenever
  // the project will be active after this change, including an unarchive
  const finalName = name ?? current.name
  const finalArchived = body?.archived ?? current.archived
  if (!finalArchived) {
    const clash = await projectRepository.findByNameLower(finalName, id)
    if (clash) {
      throw createError({
        statusCode: 409,
        statusMessage: `A project named "${clash.name}" already exists.`
      })
    }
  }

  return projectRepository.update(id, {
    name,
    description: body?.description !== undefined ? (body.description?.trim() || null) : undefined,
    archived: body?.archived
  })
})
