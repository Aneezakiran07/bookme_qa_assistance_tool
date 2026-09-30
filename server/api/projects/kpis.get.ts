import { projectRepository } from '~~/server/repositories/projectRepository'

// cross project numbers for the top of the projects page
// these are basic counts, so any signed in and active user can read them
// the global api middleware already rejects everyone else before this runs
export default defineEventHandler(async () => {
  return projectRepository.getFleetKpis()
})
