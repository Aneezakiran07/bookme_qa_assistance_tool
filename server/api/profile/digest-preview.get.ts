import { dashboardRepository } from '~~/server/repositories/dashboardRepository'

// builds the same digest content the daily-digest cron job emails out,
// but for the signed in user only, so the profile page can render it
// as a live preview. developers get their personal open bug numbers
// plus a short list of what is still open. qa leads and admins get the
// project wide open bug counts and today's pass rate instead.
export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser
  const today = new Date().toISOString().slice(0, 10)

  if (currentUser.role === 'Developer') {
    const summary = await dashboardRepository.getDeveloperSummary(currentUser.id)
    const bugs = await dashboardRepository.getDeveloperBugs(currentUser.id, 10)

    return {
      scope: 'developer' as const,
      openBugs: summary.my_open_bugs,
      criticalHighOpen: summary.critical_high_open,
      pendingRetest: summary.pending_retest,
      resolvedToday: summary.resolved_today,
      bugs: bugs.map((b) => ({
        id: b.id,
        code: `BUG-${String(b.id).padStart(3, '0')}`,
        title: b.title,
        severity: b.severity,
        status: b.status
      }))
    }
  }

  const metrics = await dashboardRepository.getSnapshotMetrics(null, null)
  const passRate = await dashboardRepository.getPassRate(today, today, null, null)

  return {
    scope: 'lead' as const,
    openBugs: metrics.open_bugs,
    openCriticalHigh: metrics.open_critical_high,
    passRate: passRate.pass_rate,
    passedExecutions: passRate.passed_executions,
    totalExecutions: passRate.total_executions
  }
})