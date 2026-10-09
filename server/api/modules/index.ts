import { moduleRepository } from '~~/server/repositories/moduleRepository'
import { requireProject } from '~~/server/utils/requireProject'

// step 1 of the workflow: modules are the top level grouping every
// requirement and test case hangs off of. every active team member can
// list modules (used to populate every "Filter by Module" dropdown across
// the app) and create one inline (used by ModuleSelect's "create module"
// flow), so there is no requireRole call here. renaming and deleting a
// module are restricted separately in [id].put.ts and [id].delete.ts.
export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser
  const project = await requireProject(event, { write: event.method !== 'GET' })

  if (event.method === 'GET') {
    return moduleRepository.list(project.id)
  }

  if (event.method === 'POST') {
    const body = await readBody<{ name: string }>(event)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name) {
      throw createError({ statusCode: 400, statusMessage: 'Module name is required' })
    }

    const existing = await moduleRepository.findByNameLower(project.id, name)
    if (existing) {
      throw createError({
        statusCode: 409,
        statusMessage: `A module named "${existing.name}" already exists.`
      })
    }

    return moduleRepository.create(project.id, name, currentUser.id)
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})