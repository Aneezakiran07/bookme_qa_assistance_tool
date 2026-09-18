import { bugRepository } from '~~/server/repositories/bugRepository'
import { moduleRepository } from '~~/server/repositories/moduleRepository'
import { bugStatusHistoryRepository } from '~~/server/repositories/bugStatusHistoryRepository'

const VALID_SEVERITIES = ['Critical', 'High', 'Medium', 'Low']
const VALID_PRIORITIES = ['High', 'Medium', 'Low']

// Minimal create endpoint for the FAIL -> Log Bug flow on Test Executions.
// The full Bugs module (list/detail/edit/lifecycle) will extend this file.
export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser
  const body = await readBody<{
    title: string
    moduleId: number
    severity: string
    priority?: string | null
    environmentBuild?: string | null
    linkedTestCaseId?: number | null
    releaseId?: number | null
    stepsToReproduce?: string | null
    actualResult?: string | null
    ownerId?: number | null
  }>(event)

  const title = body?.title?.trim()
  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  }

  const moduleId = Number(body?.moduleId)
  if (!moduleId) {
    throw createError({ statusCode: 400, statusMessage: 'Module is required' })
  }
  const mod = await moduleRepository.findById(moduleId)
  if (!mod) {
    throw createError({ statusCode: 404, statusMessage: 'Module not found' })
  }

  if (!VALID_SEVERITIES.includes(body.severity)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid severity' })
  }

  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid priority' })
  }

  const created = await bugRepository.create({
    title,
    moduleId,
    severity: body.severity,
    priority: body.priority ?? null,
    environmentBuild: body.environmentBuild?.trim() || null,
    linkedTestCaseId: body.linkedTestCaseId ?? null,
    releaseId: body.releaseId ?? null,
    stepsToReproduce: body.stepsToReproduce || null,
    actualResult: body.actualResult || null,
    reportedBy: currentUser.id,
    ownerId: body.ownerId ?? null
  })

  // audits the bug's starting point so the timeline on the detail page
  // never opens empty; every later transition builds on this first row
  await bugStatusHistoryRepository.create({
    bugId: created.id,
    oldStatus: null,
    newStatus: 'Open',
    changedBy: currentUser.id
  })

  return created
})
