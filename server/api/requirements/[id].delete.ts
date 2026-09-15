import { requirementRepository } from '~~/server/repositories/requirementRepository'

// soft delete only: flips archived to true instead of removing the row,
// so linked test cases and history stay intact. open to every active
// team member per the non-restrictive access model for this pilot.
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid requirement id' })
  }

  const existing = await requirementRepository.findById(id)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Requirement not found' })
  }

  const archived = await requirementRepository.archive(id)
  return { archived: true, requirement: archived }
})
