import { bugRepository } from '~~/server/repositories/bugRepository'
import type { DeveloperBugScope } from '~~/server/repositories/bugRepository'

const VALID_SCOPES: DeveloperBugScope[] = ['mine', 'reported', 'team']

// backs the Bugs Directory's scope toolbar: the list for whichever scope
// is selected, filtered by module/severity/status on top of that.
//
// userId is always event.context.currentUser.id (the signed-in
// session), never taken from the query string -- otherwise a developer
// could view another developer's "mine"/"reported" queue just by
// changing the request. only the "team" scope is intentionally
// unscoped by owner or reporter.
export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser
  const userId = currentUser.id

  const query = getQuery(event)
  const scope: DeveloperBugScope = VALID_SCOPES.includes(query.scope as DeveloperBugScope)
    ? (query.scope as DeveloperBugScope)
    : 'mine'

  const bugs = await bugRepository.listForDeveloper(userId, scope, {
    moduleId: query.moduleId ? Number(query.moduleId) : undefined,
    severity: query.severity ? String(query.severity) : undefined,
    status: query.status ? String(query.status) : undefined
  })

  return { scope, bugs }
})
