import { bugRepository } from '~~/server/repositories/bugRepository'
import { userRepository } from '~~/server/repositories/userRepository'
import { bugStatusHistoryRepository } from '~~/server/repositories/bugStatusHistoryRepository'
import { bugAssignmentLogRepository } from '~~/server/repositories/bugAssignmentLogRepository'
import { sendEmail } from '~~/server/utils/email'

const VALID_SEVERITIES = ['Critical', 'High', 'Medium', 'Low']
const VALID_PRIORITIES = ['High', 'Medium', 'Low']
const VALID_STATUSES = ['Open', 'In Progress', 'Fixed', 'Retest', 'Closed', 'Reopened']

export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser
  const bugId = Number(getRouterParam(event, 'id'))
  if (!bugId || Number.isNaN(bugId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid bug id' })
  }

  const existing = await bugRepository.findById(bugId)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Bug not found' })
  }

  // steps to reproduce and actual result are QA-owned: what the tester
  // did and what actually happened. dev notes are the developer's own
  // comment field. each role can only write to its own field -- this
  // mirrors the UI gating on the bug detail page, but is enforced here
  // too since a UI-only gate never actually stops a direct API call
  const isQaRole = currentUser.role === 'QA Lead' || currentUser.role === 'Tester' || currentUser.role === 'Admin'
  const isDeveloperRole = currentUser.role === 'Developer' || currentUser.role === 'Admin'

  const body = await readBody<{
    title?: string
    severity?: string
    priority?: string | null
    status?: string
    ownerId?: number | null
    environmentBuild?: string | null
    linkedTestCaseId?: number | null
    releaseId?: number | null
    stepsToReproduce?: string | null
    actualResult?: string | null
    devNotes?: string | null
  }>(event)

  const fields: Record<string, unknown> = {}

  if (body.title !== undefined) {
    const title = body.title.trim()
    if (!title) {
      throw createError({ statusCode: 400, statusMessage: 'Title is required' })
    }
    fields.title = title
  }

  if (body.severity !== undefined) {
    if (!VALID_SEVERITIES.includes(body.severity)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid severity' })
    }
    fields.severity = body.severity
  }

  if (body.priority !== undefined) {
    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid priority' })
    }
    fields.priority = body.priority ?? null
  }

  if (body.environmentBuild !== undefined) {
    fields.environment_build = body.environmentBuild?.trim() || null
  }

  if (body.stepsToReproduce !== undefined) {
    if (!isQaRole) {
      throw createError({ statusCode: 403, statusMessage: 'Only QA can edit steps to reproduce' })
    }
    fields.steps_to_reproduce = body.stepsToReproduce || null
  }

  if (body.actualResult !== undefined) {
    if (!isQaRole) {
      throw createError({ statusCode: 403, statusMessage: 'Only QA can edit the actual result' })
    }
    fields.actual_result = body.actualResult || null
  }

  if (body.devNotes !== undefined) {
    if (!isDeveloperRole) {
      throw createError({ statusCode: 403, statusMessage: 'Only the developer can edit their notes' })
    }
    fields.dev_notes = body.devNotes || null
  }

  if (body.releaseId !== undefined) {
    fields.release_id = body.releaseId ?? null
  }

  if (body.linkedTestCaseId !== undefined) {
    fields.linked_test_case_id = body.linkedTestCaseId ?? null
  }

  // any status can be selected directly now; no lifecycle map to satisfy.
  // still audited in bug_status_history so the timeline stays intact, and
  // last_status_change_at still moves with it
  if (body.status !== undefined && body.status !== existing.status) {
    if (!VALID_STATUSES.includes(body.status)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid status' })
    }
    fields.status = body.status
    fields.last_status_change_at = new Date().toISOString()
  }

  // reassignment is audited in bug_assignment_log with the bug's severity
  // at the moment of assignment, so historical severity isn't lost if the
  // bug's severity changes later
  let newOwner: Awaited<ReturnType<typeof userRepository.findById>> = null
  if (body.ownerId !== undefined && body.ownerId !== existing.owner_id) {
    if (body.ownerId !== null) {
      newOwner = await userRepository.findById(body.ownerId)
      if (!newOwner) {
        throw createError({ statusCode: 404, statusMessage: 'Assignee not found' })
      }
    }
    fields.owner_id = body.ownerId
  }

  if (Object.keys(fields).length === 0) {
    return bugRepository.findByIdWithMeta(bugId)
  }

  if (fields.status) {
    await bugStatusHistoryRepository.create({
      bugId,
      oldStatus: existing.status,
      newStatus: fields.status as string,
      changedBy: currentUser.id
    })
  }

  if ('owner_id' in fields && fields.owner_id !== null) {
    await bugAssignmentLogRepository.create({
      bugId,
      assignedTo: fields.owner_id as number,
      assignedBy: currentUser.id,
      severityAtAssignment: (fields.severity as string) ?? existing.severity
    })
  }

  await bugRepository.update(bugId, fields as any)

  if (newOwner) {
    const bugCode = `BUG-${String(bugId).padStart(3, '0')}`
    const config = useRuntimeConfig()
    const bugUrl = `${config.public.appUrl}/bugs/${bugId}`
    const title = (fields.title as string) ?? existing.title
    const severity = (fields.severity as string) ?? existing.severity

    // fire and forget: a failed email should never turn a successful
    // reassignment into a 500 for the person doing the assigning
    sendEmail({
      to: newOwner.email,
      subject: `${bugCode} assigned to you: ${title}`,
      html: `
        <p>${currentUser.email} assigned you a bug.</p>
        <p><strong>${bugCode}</strong> &mdash; ${title}</p>
        <p>Severity: ${severity}</p>
        <p><a href="${bugUrl}">${bugUrl}</a></p>
      `
    }).catch((err) => {
      console.error(`Failed to send assignment email for bug ${bugId} to ${newOwner!.email}`, err)
    })
  }

  return bugRepository.findByIdWithMeta(bugId)
})
