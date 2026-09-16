import { bugRepository } from '~~/server/repositories/bugRepository'

// soft delete only, matches requirements' archive pattern: flips
// `archived` to true instead of removing the row, so its attachments,
// assignment log, and status history stay intact. open to every active
// user by design, same as every other bug mutation in this module.
export default defineEventHandler(async (event) => {
  const bugId = Number(getRouterParam(event, 'id'))
  if (!bugId || Number.isNaN(bugId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid bug id' })
  }

  const existing = await bugRepository.findById(bugId)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Bug not found' })
  }

  const archived = await bugRepository.archive(bugId)
  return { archived: true, bug: archived }
})
