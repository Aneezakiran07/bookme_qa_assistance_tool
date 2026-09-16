import { releaseRepository } from '~~/server/repositories/releaseRepository'

const VALID_STATUSES = ['Not Started', 'In Progress', 'Passed', 'Failed']

export default defineEventHandler(async (event) => {
  if (event.method === 'GET') {
    return releaseRepository.listWithStats()
  }

  if (event.method === 'POST') {
    const body = await readBody<{
      version: string
      releaseDate?: string | null
      regressionStatus?: string
    }>(event)

    const version = body?.version?.trim()
    if (!version) {
      throw createError({ statusCode: 400, statusMessage: 'Version is required' })
    }

    const existing = await releaseRepository.findByVersion(version)
    if (existing) {
      throw createError({
        statusCode: 409,
        statusMessage: `A release named "${existing.version}" already exists.`
      })
    }

    const regressionStatus = body?.regressionStatus ?? 'Not Started'
    if (!VALID_STATUSES.includes(regressionStatus)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid regression status' })
    }

    return releaseRepository.create({
      version,
      releaseDate: body?.releaseDate ?? null,
      regressionStatus
    })
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
