import { moduleRepository } from '~~/server/repositories/moduleRepository'

// step 1 of the workflow: modules are the top level grouping every
// requirement and test case hangs off of. every active team member can
// list modules (used to populate every "Filter by Module" dropdown across
// the app) and create one inline (used by ModuleSelect's "create module"
// flow), so there is no requireRole call here. renaming and deleting a
// module are restricted separately in [id].put.ts and [id].delete.ts.
export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser

  if (event.method === 'GET') {
    return moduleRepository.list()
  }

  if (event.method === 'POST') {
    const body = await readBody<{ name: string }>(event)
    const name = body?.name?.trim()
    if (!name) {
      throw createError({ statusCode: 400, statusMessage: 'Module name is required' })
    }

    const existing = await moduleRepository.findByNameLower(name)
    if (existing) {
      throw createError({
        statusCode: 409,
        statusMessage: `A module named "${existing.name}" already exists.`
      })
    }

    return moduleRepository.create(name, currentUser.id)
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})