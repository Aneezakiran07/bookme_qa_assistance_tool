import { bugRepository } from '~~/server/repositories/bugRepository'
import { requireProject } from '~~/server/utils/requireProject'

export default defineEventHandler(async (event) => {
  const project = await requireProject(event)
  return bugRepository.metrics(project.id)
})
