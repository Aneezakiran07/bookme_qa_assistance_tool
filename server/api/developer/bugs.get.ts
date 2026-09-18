import { bugRepository } from '~~/server/repositories/bugRepository'
import type { DeveloperBugScope } from '~~/server/repositories/bugRepository'
import { karachiNow, mondayOfThisWeek, firstOfThisMonth } from '~~/server/utils/karachiDate'

const VALID_SCOPES: DeveloperBugScope[] = ['mine', 'team']
const VALID_PERIODS = ['all', 'day', 'week', 'month'] as const
type Period = (typeof VALID_PERIODS)[number]

// backs the Bugs Directory's scope toolbar: the list for whichever scope
// is selected, filtered by module/severity/status on top of that, plus
// an optional activity period (today / this week / this month) so a
// developer can look back at what moved recently without leaving the
// full directory for the day/week only view on their profile page.
// "all" (the default) keeps the old behaviour: no time bound at all.
//
// userId is always event.context.currentUser.id (the signed-in
// session), never taken from the query string -- otherwise a developer
// could view another developer's "mine" queue just by
// changing the request. only the "team" scope is intentionally
// unscoped by owner.
export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser
  const userId = currentUser.id

  const query = getQuery(event)
  const scope: DeveloperBugScope = VALID_SCOPES.includes(query.scope as DeveloperBugScope)
    ? (query.scope as DeveloperBugScope)
    : 'mine'
  const period: Period = VALID_PERIODS.includes(query.period as Period) ? (query.period as Period) : 'all'

  const now = karachiNow()
  const today = now.toISOString().slice(0, 10)
  const periodStart =
    period === 'day' ? today
    : period === 'week' ? mondayOfThisWeek(now)
    : period === 'month' ? firstOfThisMonth(now)
    : undefined
  const periodEnd = period === 'all' ? undefined : today

  const bugs = await bugRepository.listForDeveloper(userId, scope, {
    moduleId: query.moduleId ? Number(query.moduleId) : undefined,
    severity: query.severity ? String(query.severity) : undefined,
    status: query.status ? String(query.status) : undefined,
    periodStart,
    periodEnd
  })

  return { scope, period, bugs }
})
