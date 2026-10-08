// end of day digest, sent once a day by Vercel Cron, and only about Critical and High bugs
// a person with no open Critical or High bug gets no email at all
// it reads live data through the same repository methods the dashboards already use
//
// Developers get their own open/blocker/pending/resolved numbers plus a
// short list of what's still open. QA Leads, Admins, and Testers get a
// shorter project-wide summary instead (open bug counts and today's
// pass rate), plus a short list of bugs assigned to them with activity
// today -- the same owner_id-based "my bugs" scoping the developer
// email above uses, same idea as the profile page's live digest
// preview. anyone with nothing open and nothing that happened today is
// skipped so people don't get an empty "nothing happened" email every
// night.
//
// the digest is not tied to one project, so it reads across every project
// and each bug row in the email shows the name of the project it belongs to
//
// the CRON_SECRET check lives in requireCronSecret so every cron route
// shares one validation path instead of duplicating it

import { userRepository } from '~~/server/repositories/userRepository'
import { dashboardRepository } from '~~/server/repositories/dashboardRepository'
import { sendDailyDigestEmail } from '~~/server/utils/email'
import { requireCronSecret } from '~~/server/utils/cronAuth'

// project names are typed by people, so they are escaped before going into the email html
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default defineEventHandler(async (event) => {
  requireCronSecret(event)

  const config = useRuntimeConfig()
  const appUrl = config.public.appUrl
  const today = new Date().toISOString().slice(0, 10)

  const users = await userRepository.listActive()
  const developers = users.filter((u) => u.role === 'Developer')
  // QA Lead and Tester no longer receive the daily digest email at all --
  // only Admin still gets the project-wide summary below. Developers are
  // unaffected and keep getting their own bug digest above.
  const leads = users.filter((u) => u.role === 'Admin')

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const dev of developers) {
    try {
      const summary = await dashboardRepository.getDeveloperSummary(null, dev.id)
      // only Critical and High bugs are worth an email
      const hasActivity = summary.critical_high_open > 0

      if (!hasActivity) {
        skipped += 1
        continue
      }

      const { bugs: openBugs } = await dashboardRepository.getDeveloperBugs(null, dev.id, 50, { mode: 'open' })
      const bugs = openBugs.filter((b) => b.severity === 'Critical' || b.severity === 'High').slice(0, 10)
      const bugListHtml = bugs
        .map((b) => {
          const bugCode = `BUG-${String(b.bug_number).padStart(3, '0')}`
          return `<li>[${escapeHtml(b.project_name)}] <a href="${appUrl}/bugs/${b.id}">${bugCode}</a> &mdash; ${b.title} (${b.severity}, ${b.status})</li>`
        })
        .join('')

      const delivered = await sendDailyDigestEmail(dev.email, {
        subject: `Your daily bug digest: ${summary.critical_high_open} Critical or High open`,
        html: `
          <p>These are your open Critical and High bugs.</p>
          <ul>
            <li>Open bugs: ${summary.my_open_bugs}</li>
            <li>Critical/High open: ${summary.critical_high_open}</li>
            <li>Pending verification: ${summary.pending_retest}</li>
            <li>Resolved today: ${summary.resolved_today}</li>
          </ul>
          ${bugListHtml ? `<p>Open Critical and High bugs:</p><ul>${bugListHtml}</ul>` : ''}
        `
      })
      if (delivered) sent += 1
      else failed += 1
    } catch (err) {
      failed += 1
      console.error(`Failed to send daily digest to developer ${dev.id} (${dev.email})`, err)
    }
  }

  for (const lead of leads) {
    try {
      const metrics = await dashboardRepository.getSnapshotMetrics(null, null, null)
      const passRate = await dashboardRepository.getPassRate(null, today, today, null, null)
      const hasActivity = metrics.open_critical_high > 0

      if (!hasActivity) {
        skipped += 1
        continue
      }

      // same "bugs assigned to me" scoping as the profile page's live
      // preview and the developer email above -- via owner_id, now
      // that module assignment is gone.
      const { bugs: todayBugs } = await dashboardRepository.getDeveloperBugsForPeriod(null, lead.id, today, today, 50)
      const bugs = todayBugs.filter((b) => b.severity === 'Critical' || b.severity === 'High').slice(0, 10)
      const bugListHtml = bugs
        .map((b) => {
          const bugCode = `BUG-${String(b.bug_number).padStart(3, '0')}`
          return `<li>[${escapeHtml(b.project_name)}] <a href="${appUrl}/bugs/${b.id}">${bugCode}</a> &mdash; ${b.title} (${b.severity}, ${b.status})</li>`
        })
        .join('')

      const delivered = await sendDailyDigestEmail(lead.email, {
        subject: `Project daily digest: ${metrics.open_critical_high} Critical or High open`,
        html: `
          <p>Project summary for today.</p>
          <ul>
            <li>Open bugs: ${metrics.open_bugs}</li>
            <li>Open Critical/High: ${metrics.open_critical_high}</li>
            <li>Today's pass rate: ${passRate.pass_rate}% (${passRate.passed_executions}/${passRate.total_executions})</li>
          </ul>
          ${bugListHtml ? `<p>Your assigned Critical and High bugs with activity today:</p><ul>${bugListHtml}</ul>` : ''}
        `
      })
      if (delivered) sent += 1
      else failed += 1
    } catch (err) {
      failed += 1
      console.error(`Failed to send daily digest to lead ${lead.id} (${lead.email})`, err)
    }
  }

  return { sent, skipped, failed }
})