import { requireRole, QA_WORKSPACE_ROLES } from '~~/server/utils/authorize'
import { testCaseRepository } from '~~/server/repositories/testCaseRepository'
import { requireProject } from '~~/server/utils/requireProject'

// backs the table's "Duplicate" row action: clones a test case (title
// suffixed "(Copy)") including its linked requirements.
export default defineEventHandler(async (event) => {
  requireRole(event, QA_WORKSPACE_ROLES)
  const currentUser = event.context.currentUser
  const project = await requireProject(event, { write: true })
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid test case id' })
  }

  const duplicated = await testCaseRepository.duplicate(project.id, id, currentUser.id)
  if (!duplicated) {
    throw createError({ statusCode: 404, statusMessage: 'Test case not found' })
  }

  return duplicated
})
