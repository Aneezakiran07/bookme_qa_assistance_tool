import { projectRepository } from '~~/server/repositories/projectRepository'
import { requireRole } from '~~/server/utils/authorize'

// only admins and qa leads can create a project, the slug is generated here
// on the server and cannot be chosen or changed by the client
export default defineEventHandler(async (event) => {
  const currentUser = requireRole(event, ['Admin', 'QA Lead'])

  const body = await readBody<{ name?: string; description?: string | null }>(event)
  const name = body?.name?.trim()
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Project name is required' })
  }

  const existing = await projectRepository.findByNameLower(name)
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: `A project named "${existing.name}" already exists.`
    })
  }

  try {
    return await projectRepository.create({
      name,
      description: body?.description?.trim() || null,
      createdBy: currentUser.id
    })
  } catch (error: any) {
    // two people creating the same name at once lands here through the unique index
    if (error?.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: `A project named "${name}" already exists.` })
    }
    throw error
  }
})
