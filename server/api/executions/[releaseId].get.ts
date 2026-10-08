import { requireRole, QA_WORKSPACE_ROLES } from '~~/server/utils/authorize'
import { releaseRepository } from '~~/server/repositories/releaseRepository'
import { executionRepository } from '~~/server/repositories/executionRepository'
import { requireProject } from '~~/server/utils/requireProject'

export default defineEventHandler(async (event) => {
  requireRole(event, QA_WORKSPACE_ROLES)
  const project = await requireProject(event)
  const releaseId = Number(getRouterParam(event, 'releaseId'))
  if (!releaseId || Number.isNaN(releaseId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid release id' })
  }

  const release = await releaseRepository.findById(project.id, releaseId)
  if (!release) {
    throw createError({ statusCode: 404, statusMessage: 'Release not found' })
  }

  const testCases = await executionRepository.getReleaseState(releaseId)

  return { release, testCases }
})
