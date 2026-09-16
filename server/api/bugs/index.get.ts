import { bugRepository } from '~~/server/repositories/bugRepository'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return bugRepository.list({
    moduleId: query.moduleId ? Number(query.moduleId) : undefined,
    severity: query.severity ? String(query.severity) : undefined,
    status: query.status ? String(query.status) : undefined,
    releaseId: query.releaseId ? Number(query.releaseId) : undefined
  })
})
