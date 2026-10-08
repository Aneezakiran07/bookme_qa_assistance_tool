import { requireRole, QA_WORKSPACE_ROLES } from '~~/server/utils/authorize'
import { testCaseRepository } from '~~/server/repositories/testCaseRepository'
import { requireProject } from '~~/server/utils/requireProject'

// soft delete only: flips archived to true instead of removing the row.
// test_executions.test_case_id is `on delete restrict`, so a hard delete
// would 500 the moment a test case has any execution history -- this
// keeps that history (and any requirement/release links) intact, same
// pattern as requirements' delete.
export default defineEventHandler(async (event) => {
  requireRole(event, QA_WORKSPACE_ROLES)
  const project = await requireProject(event, { write: true })
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid test case id' })
  }

  const existing = await testCaseRepository.findById(project.id, id)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Test case not found' })
  }

  const archived = await testCaseRepository.archive(project.id, id)
  return { archived: true, testCase: archived }
})
