import { requireRole, QA_WORKSPACE_ROLES } from '~~/server/utils/authorize'
import { releaseRepository } from '~~/server/repositories/releaseRepository'
import { testCaseRepository } from '~~/server/repositories/testCaseRepository'
import { executionRepository } from '~~/server/repositories/executionRepository'
import { requireProject } from '~~/server/utils/requireProject'

const VALID_RESULTS = ['Pass', 'Fail', 'Blocked', 'Not Run'] as const

export default defineEventHandler(async (event) => {
  requireRole(event, QA_WORKSPACE_ROLES)
  const currentUser = event.context.currentUser
  const project = await requireProject(event, { write: true })

  const body = await readBody<{
    testCaseId: number
    releaseId: number
    result: string
    actualResult?: string | null
  }>(event)

  const testCaseId = Number(body?.testCaseId)
  const releaseId = Number(body?.releaseId)
  if (!testCaseId || !releaseId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'testCaseId and releaseId are required'
    })
  }

  if (!VALID_RESULTS.includes(body?.result as any)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid result' })
  }

  const testCase = await testCaseRepository.findById(project.id, testCaseId)
  // an archived test case is treated as deleted, so no new runs can be logged against it
  if (!testCase || testCase.archived) {
    throw createError({ statusCode: 404, statusMessage: 'Test case not found' })
  }

  const release = await releaseRepository.findById(project.id, releaseId)
  if (!release) {
    throw createError({ statusCode: 404, statusMessage: 'Release not found' })
  }

  // guards against logging an execution for a test case that was never
  // assigned to this release's suite in the first place
  const isAssigned = await testCaseRepository.isLinkedToRelease(testCaseId, releaseId)
  if (!isAssigned) {
    throw createError({
      statusCode: 400,
      statusMessage: 'This test case is not assigned to this release'
    })
  }

  return executionRepository.create({
    testCaseId,
    releaseId,
    result: body.result as 'Pass' | 'Fail' | 'Blocked' | 'Not Run',
    actualResult: body.actualResult?.toString().trim() || null,
    executedBy: currentUser.id,
    // snapshot the test case exactly as it is right now, so a later edit
    // to its title/steps/expected result never rewrites this run's history
    testCaseTitleSnapshot: testCase.title,
    stepsSnapshot: testCase.steps,
    expectedResultSnapshot: testCase.expected_result
  })
})
