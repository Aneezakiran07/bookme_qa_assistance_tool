import { projectRepository } from '~~/server/repositories/projectRepository'
import { requireRole } from '~~/server/utils/authorize'

// cross project numbers for the top of the projects page
// only Admin and QA Lead can read them, the page never calls this for anyone else
export default defineEventHandler(async (event) => {
  requireRole(event, ['Admin', 'QA Lead'])
  return projectRepository.getFleetKpis()
})
