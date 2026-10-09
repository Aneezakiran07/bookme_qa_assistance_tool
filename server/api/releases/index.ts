import { requireRole, QA_WORKSPACE_ROLES } from '~~/server/utils/authorize'
import { releaseRepository } from '~~/server/repositories/releaseRepository'
import { requireProject } from '~~/server/utils/requireProject'

export default defineEventHandler(async (event) => {
  requireRole(event, QA_WORKSPACE_ROLES)
  const project = await requireProject(event, { write: event.method !== 'GET' })

  if (event.method === 'GET') {
    return releaseRepository.listWithStats(project.id)
  }

  if (event.method === 'POST') {
    const body = await readBody<{
      version: string
      releaseDate?: string | null
    }>(event)

    const version = typeof body?.version === 'string' ? body.version.trim() : ''
    if (!version) {
      throw createError({ statusCode: 400, statusMessage: 'Version is required' })
    }

    const existing = await releaseRepository.findByVersion(project.id, version)
    if (existing) {
      throw createError({
        statusCode: 409,
        statusMessage: `A release named "${existing.version}" already exists.`
      })
    }

    return releaseRepository.create(project.id, {
      version,
      releaseDate: body?.releaseDate ?? null
    })
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
