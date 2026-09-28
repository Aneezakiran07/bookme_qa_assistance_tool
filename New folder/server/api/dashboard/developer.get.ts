import { dashboardRepository } from '~~/server/repositories/dashboardRepository'

// developer's own workload snapshot: the 4 summary counts, their
// currently assigned open bugs, and which modules those bugs cluster
// in. Deliberately has no moduleId/releaseId query params like
// /api/dashboard/metrics -- this view is a fixed "just my stuff" scope,
// not a filterable project-wide one.
//
// userId always comes from the session (event.context.currentUser, set
// by server/middleware/requireApprovedUser.ts), never from the query
// string, so a developer can only ever see their own queue here.
export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser
  const userId = currentUser.id

  const [summary, bugsPage, hotspots] = await Promise.all([
    dashboardRepository.getDeveloperSummary(userId),
    dashboardRepository.getDeveloperBugs(userId, 50, { mode: 'open' }),
    dashboardRepository.getDeveloperHotspots(userId)
  ])

  return { summary, bugs: bugsPage.bugs, hotspots }
})
