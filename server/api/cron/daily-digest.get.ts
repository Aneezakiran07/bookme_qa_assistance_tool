// end of day digest, one email per active user, sent near end of day
// (scheduled a few minutes after daily-snapshot in vercel.json so it
// feels like the same "end of day" event, though it doesn't actually
// depend on that job -- it reads live data through the same repository
// methods the dashboards already use).
//
// Developers get their own open/blocker/pending/resolved numbers plus a
// short list of what's still open. QA Leads, Admins, and Testers get a
// much shorter project-wide summary instead: open bug counts and
// today's pass rate. anyone with nothing open and nothing that happened
// today is skipped so people don't get an empty "nothing happened"
// email every night.
//
// same CRON_SECRET gate as daily-snapshot, pulled into requireCronSecret
// so both routes share one validation path instead of duplicating it.

import { userRepository } from '~~/server/repositories/userRepository'
import { dashboardRepository } from '~~/server/repositories/dashboardRepository'
import { sendEmail } from '~~/server/utils/email'
import { requireCronSecret } from '~~/server/utils/cronAuth'

export default defineEventHandler(async (event) => {
  requireCronSecret(event)

  const config = useRuntimeConfig()
  const appUrl = config.public.appUrl
  const today = new Date().toISOString().slice(0, 10)

  const users = await userRepository.listActive()
  const developers = users.filter((u) => u.role === 'Developer')
  const leads = users.filter((u) => u.role === 'QA Lead' || u.role === 'Admin' || u.role === 'Tester')

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const dev of developers) {
    try {
      const summary = await dashboardRepository.getDeveloperSummary(dev.id)
      const hasActivity = summary.my_open_bugs > 0 || summary.resolved_today > 0

      if (!hasActivity) {
        skipped += 1
        continue
      }

      const { bugs } = await dashboardRepository.getDeveloperBugs(dev.id, 10, { mode: 'open' })
      const bugListHtml = bugs
        .map((b) => {
          const bugCode = `BUG-${String(b.id).padStart(3, '0')}`
          return `<li><a href="${appUrl}/bugs/${b.id}">${bugCode}</a> &mdash; ${b.title} (${b.severity}, ${b.status})</li>`
        })
        .join('')

      await sendEmail({
        to: dev.email,
        subject: `Your daily bug digest: ${summary.my_open_bugs} open`,
        html: `
          <p>Here's where your bugs stand today.</p>
          <ul>
            <li>Open bugs: ${summary.my_open_bugs}</li>
            <li>Critical/High open: ${summary.critical_high_open}</li>
            <li>Pending verification: ${summary.pending_retest}</li>
            <li>Resolved today: ${summary.resolved_today}</li>
          </ul>
          ${bugListHtml ? `<p>Your open bugs:</p><ul>${bugListHtml}</ul>` : ''}
        `
      })
      sent += 1
    } catch (err) {
      failed += 1
      console.error(`Failed to send daily digest to developer ${dev.id} (${dev.email})`, err)
    }
  }

  for (const lead of leads) {
    try {
      const metrics = await dashboardRepository.getSnapshotMetrics(null, null)
      const passRate = await dashboardRepository.getPassRate(today, today, null, null)
      const hasActivity = metrics.open_bugs > 0 || passRate.total_executions > 0

      if (!hasActivity) {
        skipped += 1
        continue
      }

      await sendEmail({
        to: lead.email,
        subject: `Project daily digest: ${metrics.open_bugs} open bugs`,
        html: `
          <p>Project summary for today.</p>
          <ul>
            <li>Open bugs: ${metrics.open_bugs}</li>
            <li>Open Critical/High: ${metrics.open_critical_high}</li>
            <li>Today's pass rate: ${passRate.pass_rate}% (${passRate.passed_executions}/${passRate.total_executions})</li>
          </ul>
        `
      })
      sent += 1
    } catch (err) {
      failed += 1
      console.error(`Failed to send daily digest to lead ${lead.id} (${lead.email})`, err)
    }
  }

  return { sent, skipped, failed }
})
