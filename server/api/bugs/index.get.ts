import { bugRepository } from '~~/server/repositories/bugRepository'
import { VALID_PERIODS, resolvePeriodRange, type Period } from '~~/server/utils/karachiDate'

// QA/Tester/Admin-facing Bug Tracker (app/pages/bugs/index.vue). Same
// module/severity/status/release filters it always had, plus the same
// "activity period" filter the Developer Bugs Directory already has
// (all time / today / this week / this month), so every role filters
// bugs by recent activity the same way -- period is resolved through
// the same karachiDate helper developer/bugs.get.ts uses, so both pages
// agree on where a day/week/month starts.
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const period: Period = VALID_PERIODS.includes(query.period as Period) ? (query.period as Period) : 'all'
  const { periodStart, periodEnd } = resolvePeriodRange(period)

  return bugRepository.list({
    moduleId: query.moduleId ? Number(query.moduleId) : undefined,
    severity: query.severity ? String(query.severity) : undefined,
    status: query.status ? String(query.status) : undefined,
    releaseId: query.releaseId ? Number(query.releaseId) : undefined,
    periodStart,
    periodEnd
  })
})
