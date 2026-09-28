import { releaseRepository } from '~~/server/repositories/releaseRepository'
import { executionRepository } from '~~/server/repositories/executionRepository'

export default defineEventHandler(async (event) => {
  const releaseId = Number(getRouterParam(event, 'releaseId'))
  if (!releaseId || Number.isNaN(releaseId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid release id' })
  }

  const release = await releaseRepository.findById(releaseId)
  if (!release) {
    throw createError({ statusCode: 404, statusMessage: 'Release not found' })
  }

  const testCases = await executionRepository.getReleaseState(releaseId)

  return { release, testCases }
})
