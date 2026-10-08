import { requireRole, QA_WORKSPACE_ROLES } from '~~/server/utils/authorize'
import { testCaseRepository } from '~~/server/repositories/testCaseRepository'
import { moduleRepository } from '~~/server/repositories/moduleRepository'
import { requirementRepository } from '~~/server/repositories/requirementRepository'
import { releaseRepository } from '~~/server/repositories/releaseRepository'
import { requireProject } from '~~/server/utils/requireProject'

const VALID_PRIORITIES = ['High', 'Medium', 'Low']
const VALID_TYPES = ['Manual', 'Automated']

// updates test case fields and re-syncs its linked requirement set.
// open to every active team member per the non-restrictive access model.
export default defineEventHandler(async (event) => {
  requireRole(event, QA_WORKSPACE_ROLES)
  const currentUser = event.context.currentUser
  const project = await requireProject(event, { write: true })
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid test case id' })
  }

  const existing = await testCaseRepository.findById(project.id, id)
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
    const module = await moduleRepository.findById(project.id, Number(body.moduleId))
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

  // link ids are checked before anything is written so a bad id cannot leave a half saved test case
  const requirementIds = Array.isArray(body?.requirementIds)
    ? body.requirementIds.map(Number).filter((n) => Number.isFinite(n))
    : null
  if (requirementIds) {
    const uniqueIds = [...new Set(requirementIds)]
    if ((await requirementRepository.countInProject(project.id, uniqueIds)) !== uniqueIds.length) {
      throw createError({ statusCode: 400, statusMessage: 'One or more requirements do not belong to this project' })
    }
  }
  const releaseIds = Array.isArray(body?.releaseIds)
    ? body.releaseIds.map(Number).filter((n) => Number.isFinite(n))
    : null
  if (releaseIds) {
    const uniqueIds = [...new Set(releaseIds)]
    if ((await releaseRepository.countInProject(project.id, uniqueIds)) !== uniqueIds.length) {
      throw createError({ statusCode: 400, statusMessage: 'One or more releases do not belong to this project' })
    }
  }

  const updated = await testCaseRepository.update(project.id, id, {
    title: body?.title?.trim(),
    moduleId: body?.moduleId ? Number(body.moduleId) : undefined,
    steps: body?.steps !== undefined ? body.steps : undefined,
    expectedResult: body?.expectedResult !== undefined ? body.expectedResult : undefined,
    priority: body?.priority !== undefined ? body.priority : undefined,
    type: body?.type,
    lastModifiedBy: currentUser.id
  })

  if (requirementIds) {
    await testCaseRepository.setRequirementLinks(id, requirementIds)
  }

  if (releaseIds) {
    await testCaseRepository.setReleaseLinks(id, releaseIds)
  }

  return updated
})
