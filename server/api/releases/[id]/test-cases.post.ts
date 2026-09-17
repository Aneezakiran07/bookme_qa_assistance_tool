import { releaseRepository } from '~~/server/repositories/releaseRepository'

// Backs the Scoped Test Suite tab's bulk add/remove: replaces the full
// set of test cases linked to this release with whatever ids the client
// sends, in one call, rather than issuing an add/remove request per row.
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid release id' })
  }

  const existing = await releaseRepository.findById(id)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Release not found' })
  }

  const body = await readBody<{ testCaseIds?: number[] }>(event)
  if (!Array.isArray(body?.testCaseIds)) {
    throw createError({ statusCode: 400, statusMessage: 'testCaseIds must be an array' })
  }

  const testCaseIds = body.testCaseIds.map(Number).filter((n) => Number.isFinite(n))
  await releaseRepository.syncTestCases(id, testCaseIds)

  return { synced: true, testCaseIds }
})
