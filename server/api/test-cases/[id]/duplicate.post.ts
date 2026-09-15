import { testCaseRepository } from '~~/server/repositories/testCaseRepository'

// backs the table's "Duplicate" row action: clones a test case (title
// suffixed "(Copy)") including its linked requirements.
export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser
  const id = Number(getRouterParam(event, 'id'))
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid test case id' })
  }

  const duplicated = await testCaseRepository.duplicate(id, currentUser.id)
  if (!duplicated) {
    throw createError({ statusCode: 404, statusMessage: 'Test case not found' })
  }

  return duplicated
})
