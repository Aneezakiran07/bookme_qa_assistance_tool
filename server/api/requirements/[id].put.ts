import { requirementRepository } from '~~/server/repositories/requirementRepository'
import { moduleRepository } from '~~/server/repositories/moduleRepository'

const VALID_STATUSES = ['Draft', 'Approved', 'In Testing', 'Done']

// updates requirement details or moves it through a status transition.
// open to every active team member per the non-restrictive access model
// for this pilot, so no requireRole call here.
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid requirement id' })
  }

  const existing = await requirementRepository.findById(id)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Requirement not found' })
  }

  const body = await readBody<{
    title?: string
    moduleId?: number
    status?: string
    targetRelease?: string | null
    description?: string | null
  }>(event)

  if (body?.title !== undefined && !body.title.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Title cannot be empty' })
  }

  if (body?.moduleId !== undefined) {
    const module = await moduleRepository.findById(Number(body.moduleId))
    if (!module) {
      throw createError({ statusCode: 404, statusMessage: 'Selected module does not exist' })
    }
  }

  if (body?.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid status' })
  }

  const updated = await requirementRepository.update(id, {
    title: body?.title?.trim(),
    moduleId: body?.moduleId ? Number(body.moduleId) : undefined,
    targetRelease: body?.targetRelease !== undefined ? (body.targetRelease?.trim() || null) : undefined,
    status: body?.status,
    description: body?.description
  })

  return updated
})
