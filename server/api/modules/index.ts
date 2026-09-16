import { testCaseRepository } from '~~/server/repositories/testCaseRepository'
import { moduleRepository } from '~~/server/repositories/moduleRepository'

const VALID_PRIORITIES = ['High', 'Medium', 'Low']
const VALID_TYPES = ['Manual', 'Automated']

// Step 4 of the workflow: authoring structured test cases against a
// module and (optionally) against one or more requirements. non-restrictive
// access model matching requirements/index.vue: every active team member
// can list and create test cases, so no requireRole call here.
export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser

  if (event.method === 'GET') {
    const query = getQuery(event)
    const moduleId = query.moduleId ? Number(query.moduleId) : undefined
    if (query.moduleId && (!moduleId || Number.isNaN(moduleId))) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid moduleId' })
    }
    const priority = typeof query.priority === 'string' ? query.priority : undefined
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid priority filter' })
    }
    const type = typeof query.type === 'string' ? query.type : undefined
    if (type && !VALID_TYPES.includes(type)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid type filter' })
    }
    const releaseId = query.releaseId ? Number(query.releaseId) : undefined
    if (query.releaseId && (!releaseId || Number.isNaN(releaseId))) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid releaseId' })
    }

    return testCaseRepository.list({ moduleId, priority, type, releaseId })
  }

  if (event.method === 'POST') {
    const body = await readBody<{
      title: string
      moduleId: number
      steps?: string | null
      expectedResult?: string | null
      priority?: string | null
      type?: string
      requirementIds?: number[]
      releaseIds?: number[]
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

    if (body?.priority && !VALID_PRIORITIES.includes(body.priority)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid priority' })
    }

    const type = body?.type ?? 'Manual'
    if (!VALID_TYPES.includes(type)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid type' })
    }

    const requirementIds = Array.isArray(body?.requirementIds)
      ? body.requirementIds.map(Number).filter((n) => Number.isFinite(n))
      : []

    const releaseIds = Array.isArray(body?.releaseIds)
      ? body.releaseIds.map(Number).filter((n) => Number.isFinite(n))
      : []

    return testCaseRepository.create({
      title,
      moduleId,
      steps: body?.steps ?? null,
      expectedResult: body?.expectedResult ?? null,
      priority: body?.priority ?? null,
      type,
      requirementIds,
      releaseIds,
      createdBy: currentUser.id
    })
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})