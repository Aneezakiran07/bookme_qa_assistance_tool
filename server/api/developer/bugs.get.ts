import { bugRepository } from '~~/server/repositories/bugRepository'
import type { DeveloperBugScope } from '~~/server/repositories/bugRepository'

const VALID_SCOPES: DeveloperBugScope[] = ['mine', 'blockers', 'pending', 'team']

// backs the Developer Bugs view's 4 quick-filter tabs in one lightweight
// round trip: the list for whichever tab is selected, plus live counts
// for all 4 tabs so their labels never look stale after a status update.
//
// userId is always event.context.currentUser.id (the signed-in
// session), never taken from the query string -- otherwise a developer
// could view another developer's "mine"/"blockers"/"pending" queue just
// by changing the request. only the "team" scope is intentionally
// unscoped by owner.
export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser
  const userId = currentUser.id

  const query = getQuery(event)
  const scope: DeveloperBugScope = VALID_SCOPES.includes(query.scope as DeveloperBugScope)
    ? (query.scope as DeveloperBugScope)
    : 'mine'

  const [bugs, counts] = await Promise.all([
    bugRepository.listForDeveloper(userId, scope, {
      moduleId: query.moduleId ? Number(query.moduleId) : undefined,
      severity: query.severity ? String(query.severity) : undefined,
      status: query.status ? String(query.status) : undefined
    }),
    bugRepository.developerCounts(userId)
  ])

  return { scope, bugs, counts }
})
