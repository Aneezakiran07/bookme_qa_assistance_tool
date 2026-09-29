import type { H3Event } from 'h3'
import { projectRepository } from '~~/server/repositories/projectRepository'
import type { ProjectRecord } from '~~/server/repositories/projectRepository'

// the single place the server works out which project a request belongs to
// the client sends the project id in the x-project-id header and nothing
// else is trusted, a project id inside a request body is always ignored
// pass write true from any endpoint that creates, changes or deletes data so
// an archived project stays read only
export async function requireProject(
  event: H3Event,
  options: { write?: boolean } = {}
): Promise<ProjectRecord> {
  let project = event.context.project as ProjectRecord | undefined

  if (!project) {
    const raw = getHeader(event, 'x-project-id')
    if (!raw) {
      throw createError({ statusCode: 400, statusMessage: 'Project is required' })
    }

    const id = Number(raw)
    if (!Number.isInteger(id) || id <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid project id' })
    }

    const found = await projectRepository.findById(id)
    if (!found) {
      throw createError({ statusCode: 404, statusMessage: 'Project not found' })
    }

    project = found
    event.context.project = project
  }

  if (options.write && project.archived) {
    throw createError({
      statusCode: 403,
      statusMessage: 'This project is archived and read only. Unarchive it to make changes.'
    })
  }

  return project
}
