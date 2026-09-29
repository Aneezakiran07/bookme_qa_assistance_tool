import { bugRepository } from '~~/server/repositories/bugRepository'
import { bugAttachmentRepository } from '~~/server/repositories/bugAttachmentRepository'
import { bugAssignmentLogRepository } from '~~/server/repositories/bugAssignmentLogRepository'
import { bugStatusHistoryRepository } from '~~/server/repositories/bugStatusHistoryRepository'
import { requireProject } from '~~/server/utils/requireProject'

export default defineEventHandler(async (event) => {
  const project = await requireProject(event)
  const bugId = Number(getRouterParam(event, 'id'))
  if (!bugId || Number.isNaN(bugId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid bug id' })
  }

  const bug = await bugRepository.findByIdWithMeta(project.id, bugId)
  if (!bug) {
    throw createError({ statusCode: 404, statusMessage: 'Bug not found' })
  }

  const [attachments, assignmentLog, statusHistory] = await Promise.all([
    bugAttachmentRepository.listByBug(bugId),
    bugAssignmentLogRepository.listByBug(bugId),
    bugStatusHistoryRepository.listByBug(bugId)
  ])

  return { bug, attachments, assignmentLog, statusHistory }
})
