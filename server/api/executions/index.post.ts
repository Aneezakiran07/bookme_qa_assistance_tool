import { releaseRepository } from '~~/server/repositories/releaseRepository'
import { testCaseRepository } from '~~/server/repositories/testCaseRepository'
import { executionRepository } from '~~/server/repositories/executionRepository'

const VALID_RESULTS = ['Pass', 'Fail', 'Blocked', 'Not Run'] as const

export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser

  const body = await readBody<{
    testCaseId: number
    releaseId: number
    result: string
    notes?: string | null
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

  const testCase = await testCaseRepository.findById(testCaseId)
  if (!testCase) {
    throw createError({ statusCode: 404, statusMessage: 'Test case not found' })
  }

  const release = await releaseRepository.findById(releaseId)
  if (!release) {
    throw createError({ statusCode: 404, statusMessage: 'Release not found' })
  }

  return executionRepository.create({
    testCaseId,
    releaseId,
    result: body.result as 'Pass' | 'Fail' | 'Blocked' | 'Not Run',
    notes: body.notes?.toString().trim() || null,
    executedBy: currentUser.id
  })
})
