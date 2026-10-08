import { requireRole, QA_WORKSPACE_ROLES } from '~~/server/utils/authorize'
import { releaseRepository } from '~~/server/repositories/releaseRepository'
import { requireProject } from '~~/server/utils/requireProject'

export default defineEventHandler(async (event) => {
  requireRole(event, QA_WORKSPACE_ROLES)
  const project = await requireProject(event, { write: true })
  const id = Number(getRouterParam(event, 'id'))
  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid release id' })
  }

  const existing = await releaseRepository.findById(project.id, id)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Release not found' })
  }

  const body = await readBody<{
    version?: string
    releaseDate?: string | null
  }>(event)

  const fields: Record<string, unknown> = {}

  if (body?.version !== undefined) {
    const version = body.version.trim()
    if (!version) {
      throw createError({ statusCode: 400, statusMessage: 'Version is required' })
    }
    if (version.toLowerCase() !== existing.version.toLowerCase()) {
      const clashing = await releaseRepository.findByVersion(project.id, version)
      if (clashing) {
        throw createError({
          statusCode: 409,
          statusMessage: `A release named "${clashing.version}" already exists.`
        })
      }
    }
    fields.version = version
  }

  if (body?.releaseDate !== undefined) {
    fields.release_date = body.releaseDate ?? null
  }

  if (Object.keys(fields).length === 0) {
    return existing
  }

  return releaseRepository.update(project.id, id, fields as any)
})
