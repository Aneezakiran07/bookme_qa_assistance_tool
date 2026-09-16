import { testCaseRepository } from '~~/server/repositories/testCaseRepository'
import { moduleRepository } from '~~/server/repositories/moduleRepository'

const VALID_PRIORITIES = ['High', 'Medium', 'Low']
const VALID_TYPES = ['Manual', 'Automated']

// updates test case fields and re-syncs its linked requirement set.
// open to every active team member per the non-restrictive access model.
export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid test case id' })
  }

  const existing = await testCaseRepository.findById(id)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Test case not found' })
  }

  const body = await readBody<{
    title?: string
    moduleId?: number
    steps?: string | null
    expectedResult?: string | null
    priority?: string | null
    type?: string
    requirementIds?: number[]
    releaseIds?: number[]
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

  if (body?.priority !== undefined && body.priority !== null && !VALID_PRIORITIES.includes(body.priority)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid priority' })
  }

  if (body?.type !== undefined && !VALID_TYPES.includes(body.type)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid type' })
  }

  const updated = await testCaseRepository.update(id, {
    title: body?.title?.trim(),
    moduleId: body?.moduleId ? Number(body.moduleId) : undefined,
    steps: body?.steps !== undefined ? body.steps : undefined,
    expectedResult: body?.expectedResult !== undefined ? body.expectedResult : undefined,
    priority: body?.priority !== undefined ? body.priority : undefined,
    type: body?.type,
    lastModifiedBy: currentUser.id
  })

  if (Array.isArray(body?.requirementIds)) {
    const requirementIds = body.requirementIds.map(Number).filter((n) => Number.isFinite(n))
    await testCaseRepository.setRequirementLinks(id, requirementIds)
  }

  if (Array.isArray(body?.releaseIds)) {
    const releaseIds = body.releaseIds.map(Number).filter((n) => Number.isFinite(n))
    await testCaseRepository.setReleaseLinks(id, releaseIds)
  }

  return updated
})
