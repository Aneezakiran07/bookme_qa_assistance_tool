import { projectRepository } from '~~/server/repositories/projectRepository'

// every active user can see every project, membership is open for now
// this route does not need the project header because it lists the projects themselves
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const includeArchived = query.includeArchived === '1' || query.includeArchived === 'true'
  return projectRepository.list(includeArchived)
})
