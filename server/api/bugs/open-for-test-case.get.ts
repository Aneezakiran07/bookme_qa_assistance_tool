import { bugRepository } from '~~/server/repositories/bugRepository'
import { requireProject } from '~~/server/utils/requireProject'

// used by LogBugModal right before a tester logs a new bug from a failed
// execution, so an already open bug for the same test case surfaces
// instead of a duplicate ticket getting created silently
export default defineEventHandler(async (event) => {
  const project = await requireProject(event)
  const query = getQuery(event)
  const testCaseId = query.testCaseId ? Number(query.testCaseId) : null

  if (!testCaseId) {
    throw createError({ statusCode: 400, statusMessage: 'testCaseId is required' })
  }

  const existing = await bugRepository.findOpenByTestCase(project.id, testCaseId)
  return { existing }
})
