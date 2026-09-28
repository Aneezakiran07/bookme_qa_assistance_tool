import { requirementRepository } from '~~/server/repositories/requirementRepository'
import { moduleRepository } from '~~/server/repositories/moduleRepository'

const VALID_STATUSES = ['Draft', 'Approved', 'In Testing', 'Done']

// non-restrictive access model: every active team member (QA Lead,
// Tester, Developer, Admin) can list and create requirements across all
// modules, so unlike server/api/modules/* there is no requireRole call
// here. requireApprovedUser middleware already guarantees the caller is
// signed in and active before this handler ever runs.
export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser

  if (event.method === 'GET') {
    const query = getQuery(event)
    const moduleId = query.moduleId ? Number(query.moduleId) : undefined
    if (query.moduleId && (!moduleId || Number.isNaN(moduleId))) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid moduleId' })
    }
    return requirementRepository.list(moduleId)
  }

  if (event.method === 'POST') {
    const body = await readBody<{
      title: string
      moduleId: number
      status?: string
      targetRelease?: string | null
      description?: string | null
    }>(event)

    const title = body?.title?.trim()
    if (!title) {
      throw createError({ statusCode: 400, statusMessage: 'Title is required' })
    }

    const moduleId = Number(body?.moduleId)
    if (!moduleId) {
      throw createError({ statusCode: 400, statusMessage: 'Module is required' })
    }
    const module = await moduleRepository.findById(moduleId)
    if (!module) {
      throw createError({ statusCode: 404, statusMessage: 'Selected module does not exist' })
    }

    const status = body?.status ?? 'Draft'
    if (!VALID_STATUSES.includes(status)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid status' })
    }

    return requirementRepository.create({
      title,
      moduleId,
      targetRelease: body?.targetRelease?.trim() || null,
      status,
      description: body?.description ?? null,
      createdBy: currentUser.id
    })
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
