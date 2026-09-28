import { testCaseRepository } from '~~/server/repositories/testCaseRepository'

// soft delete only: flips archived to true instead of removing the row.
// test_executions.test_case_id is `on delete restrict`, so a hard delete
// would 500 the moment a test case has any execution history -- this
// keeps that history (and any requirement/release links) intact, same
// pattern as requirements' delete.
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid test case id' })
  }

  const existing = await testCaseRepository.findById(id)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Test case not found' })
  }

  const archived = await testCaseRepository.archive(id)
  return { archived: true, testCase: archived }
})
