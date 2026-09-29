import { bugRepository } from '~~/server/repositories/bugRepository'
import { moduleRepository } from '~~/server/repositories/moduleRepository'
import { releaseRepository } from '~~/server/repositories/releaseRepository'
import { testCaseRepository } from '~~/server/repositories/testCaseRepository'
import { userRepository } from '~~/server/repositories/userRepository'
import { bugStatusHistoryRepository } from '~~/server/repositories/bugStatusHistoryRepository'
import { bugAssignmentLogRepository } from '~~/server/repositories/bugAssignmentLogRepository'
import { sendEmail } from '~~/server/utils/email'
import { requireProject } from '~~/server/utils/requireProject'

const VALID_SEVERITIES = ['Critical', 'High', 'Medium', 'Low']
const VALID_PRIORITIES = ['High', 'Medium', 'Low']

// turns an optional id from the request body into a number or null, and
// rejects anything that is not a positive whole number
function parseOptionalId(value: unknown, label: string): number | null {
  if (value === undefined || value === null || value === '') return null
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${label}` })
  }
  return id
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// every active role can report a bug, the caller comes from the session
// and is always stored as the reporter, never taken from the request body
export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser
  const project = await requireProject(event, { write: true })

  const body = await readBody<{
    title?: string
    moduleId?: number
    severity?: string
    priority?: string | null
    environmentBuild?: string | null
    linkedTestCaseId?: number | null
    releaseId?: number | null
    stepsToReproduce?: string | null
    actualResult?: string | null
    expectedResult?: string | null
    ownerId?: number | null
  }>(event)

  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  if (!title) {
    throw createError({ statusCode: 400, statusMessage: 'Title is required' })
  }

  const moduleId = parseOptionalId(body.moduleId, 'module')
  if (!moduleId) {
    throw createError({ statusCode: 400, statusMessage: 'Module is required' })
  }
  const moduleRecord = await moduleRepository.findById(project.id, moduleId)
  if (!moduleRecord || moduleRecord.archived) {
    throw createError({ statusCode: 404, statusMessage: 'Module not found' })
  }

  if (!body.severity || !VALID_SEVERITIES.includes(body.severity)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid severity' })
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid priority' })
  }

  const linkedTestCaseId = parseOptionalId(body.linkedTestCaseId, 'test case')
  if (linkedTestCaseId && !(await testCaseRepository.findById(project.id, linkedTestCaseId))) {
    throw createError({ statusCode: 404, statusMessage: 'Linked test case not found' })
  }

  const releaseId = parseOptionalId(body.releaseId, 'release')
  if (releaseId && !(await releaseRepository.findById(project.id, releaseId))) {
    throw createError({ statusCode: 404, statusMessage: 'Release not found' })
  }

  const ownerId = parseOptionalId(body.ownerId, 'assignee')
  const owner = ownerId ? await userRepository.findById(ownerId) : null
  if (ownerId && !owner) {
    throw createError({ statusCode: 404, statusMessage: 'Assignee not found' })
  }

  const created = await bugRepository.create(project.id, {
    title,
    moduleId,
    severity: body.severity,
    priority: body.priority || null,
    environmentBuild: body.environmentBuild?.trim() || null,
    linkedTestCaseId,
    releaseId,
    stepsToReproduce: body.stepsToReproduce || null,
    actualResult: body.actualResult || null,
    expectedResult: body.expectedResult || null,
    reportedBy: currentUser.id,
    ownerId
  })

  // a null old status is how the timeline knows to show this entry as
  // the moment the bug was first reported
  await bugStatusHistoryRepository.create({
    bugId: created.id,
    oldStatus: null,
    newStatus: 'Open',
    changedBy: currentUser.id
  })

  if (owner) {
    await bugAssignmentLogRepository.create({
      bugId: created.id,
      assignedTo: owner.id,
      assignedBy: currentUser.id,
      severityAtAssignment: created.severity
    })

    const bugCode = `BUG-${String(created.id).padStart(3, '0')}`
    const config = useRuntimeConfig()
    const bugUrl = `${config.public.appUrl}/bugs/${created.id}`

    // fire and forget so a failed email never turns a logged bug into a 500
    sendEmail({
      to: owner.email,
      subject: `${bugCode} assigned to you: ${title}`,
      html: `
        <p>${escapeHtml(currentUser.email)} assigned you a bug.</p>
        <p><strong>${bugCode}</strong> &mdash; ${escapeHtml(title)}</p>
        <p>Severity: ${created.severity}</p>
        <p><a href="${bugUrl}">${bugUrl}</a></p>
      `
    }).catch((err) => {
      console.error(`Failed to send assignment email for bug ${created.id} to ${owner.email}`, err)
    })
  }

  return bugRepository.findByIdWithMeta(project.id, created.id)
})
