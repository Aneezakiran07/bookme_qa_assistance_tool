import { requireRole, QA_WORKSPACE_ROLES } from '~~/server/utils/authorize'
import { requirementRepository } from '~~/server/repositories/requirementRepository'
import { moduleRepository } from '~~/server/repositories/moduleRepository'
import { requireProject } from '~~/server/utils/requireProject'

const VALID_STATUSES = ['Draft', 'Approved', 'In Testing', 'Done']

// non-restrictive access model: every active team member (QA Lead,
// Tester, Developer, Admin) can list and create requirements across all
// modules, only Admin, QA Lead and Tester get in, a Developer is refused
// here. requireApprovedUser middleware already guarantees the caller is
// signed in and active before this handler ever runs.
export default defineEventHandler(async (event) => {
  requireRole(event, QA_WORKSPACE_ROLES)
  const currentUser = event.context.currentUser
  const project = await requireProject(event, { write: event.method !== 'GET' })

  if (event.method === 'GET') {
    const query = getQuery(event)
    const moduleId = query.moduleId ? Number(query.moduleId) : undefined
    if (query.moduleId && (!moduleId || Number.isNaN(moduleId))) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid moduleId' })
    }
    return requirementRepository.list(project.id, moduleId)
  }

  if (event.method === 'POST') {
    const body = await readBody<{
      title: string
      moduleId: number
      status?: string
      targetRelease?: string | null
      description?: string | null
    }>(event)

    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    if (!title) {
      throw createError({ statusCode: 400, statusMessage: 'Title is required' })
    }

    const moduleId = Number(body?.moduleId)
    if (!moduleId) {
      throw createError({ statusCode: 400, statusMessage: 'Module is required' })
    }
    const module = await moduleRepository.findById(project.id, moduleId)
    if (!module) {
      throw createError({ statusCode: 404, statusMessage: 'Selected module does not exist' })
    }

    if (body?.targetRelease !== undefined && body.targetRelease !== null && typeof body.targetRelease !== 'string') {
      throw createError({ statusCode: 400, statusMessage: 'Target release must be text' })
    }

    const status = body?.status ?? 'Draft'
    if (!VALID_STATUSES.includes(status)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid status' })
    }

    return requirementRepository.create(project.id, {
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
