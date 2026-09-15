import { testCaseRepository } from '~~/server/repositories/testCaseRepository'

// hard delete: schema has no archived flag on test_cases (unlike
// requirements), and requirement_test_case_links.test_case_id is
// `on delete cascade`, so removing the row cleans up its links for free.
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid test case id' })
  }

  const existing = await testCaseRepository.findById(id)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Test case not found' })
  }

  const deleted = await testCaseRepository.delete(id)
  return { deleted: true, testCase: deleted }
})
