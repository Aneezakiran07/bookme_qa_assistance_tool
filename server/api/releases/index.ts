import { releaseRepository } from '~~/server/repositories/releaseRepository'

export default defineEventHandler(async (event) => {
  if (event.method === 'GET') {
    return releaseRepository.listWithStats()
  }

  if (event.method === 'POST') {
    const body = await readBody<{
      version: string
      releaseDate?: string | null
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

    return releaseRepository.create({
      version,
      releaseDate: body?.releaseDate ?? null
    })
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
