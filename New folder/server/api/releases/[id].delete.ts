import { releaseRepository } from '~~/server/repositories/releaseRepository'

// Hard delete. test_case_release_links cascades automatically, but
// test_executions and bugs both reference releases without cascade
// (test_executions is on delete restrict; bugs has no cascade either),
// so Postgres raises a foreign-key violation (code 23503) if either has
// rows against this release. That's surfaced here as a 409 rather than
// a raw DB error, since a release with execution or bug history isn't
// meant to just disappear.
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid release id' })
  }

  const existing = await releaseRepository.findById(id)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Release not found' })
  }

  try {
    const deleted = await releaseRepository.delete(id)
    return { deleted: true, release: deleted }
  } catch (error: any) {
    if (error?.code === '23503') {
      throw createError({
        statusCode: 409,
        statusMessage: 'This release has execution history or linked bugs and cannot be deleted.'
      })
    }
    throw error
  }
})
