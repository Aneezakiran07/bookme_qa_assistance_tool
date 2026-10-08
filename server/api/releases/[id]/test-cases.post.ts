import { requireRole, QA_WORKSPACE_ROLES } from '~~/server/utils/authorize'
import { releaseRepository } from '~~/server/repositories/releaseRepository'
import { testCaseRepository } from '~~/server/repositories/testCaseRepository'
import { requireProject } from '~~/server/utils/requireProject'

// Backs the Scoped Test Suite tab's bulk add/remove: replaces the full
// set of test cases linked to this release with whatever ids the client
// sends, in one call, rather than issuing an add/remove request per row.
export default defineEventHandler(async (event) => {
  requireRole(event, QA_WORKSPACE_ROLES)
  const project = await requireProject(event, { write: true })
  const id = Number(getRouterParam(event, 'id'))
  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid release id' })
  }

  const existing = await releaseRepository.findById(project.id, id)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Release not found' })
  }

  const body = await readBody<{ testCaseIds?: number[] }>(event)
  if (!Array.isArray(body?.testCaseIds)) {
    throw createError({ statusCode: 400, statusMessage: 'testCaseIds must be an array' })
  }

  const testCaseIds = body.testCaseIds.map(Number).filter((n) => Number.isFinite(n))
  // every test case being linked must belong to the same project as the release
  const uniqueIds = [...new Set(testCaseIds)]
  const validCount = await testCaseRepository.countInProject(project.id, uniqueIds)
  if (validCount !== uniqueIds.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'One or more test cases do not belong to this project'
    })
  }

  await releaseRepository.syncTestCases(id, testCaseIds)

  return { synced: true, testCaseIds }
})
