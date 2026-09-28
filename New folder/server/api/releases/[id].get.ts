import { releaseRepository } from '~~/server/repositories/releaseRepository'
import { testCaseRepository } from '~~/server/repositories/testCaseRepository'
import { bugRepository } from '~~/server/repositories/bugRepository'

// Bundles everything the release health hub (releases/[id].vue) needs in
// one request: the release row, its aggregate stats, the full test case
// catalog (each already flagged with which releases it's scoped to, so
// the Scoped Test Suite tab can render checkboxes without a second
// round trip), the release's bugs (for the bug board, grouped client
// side by severity), and its append-only execution history.
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid release id' })
  }

  const release = await releaseRepository.findById(id)
  if (!release) {
    throw createError({ statusCode: 404, statusMessage: 'Release not found' })
  }

  const [stats, testCases, bugs, executions] = await Promise.all([
    releaseRepository.getHealthStats(id),
    testCaseRepository.list(),
    bugRepository.list({ releaseId: id }),
    releaseRepository.executionHistory(id)
  ])

  return { release, stats, testCases, bugs, executions }
})
