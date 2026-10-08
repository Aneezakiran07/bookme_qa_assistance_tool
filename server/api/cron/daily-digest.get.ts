// end of day digest, sent once a day by Vercel Cron at 18:30 Karachi time
// (13:30 UTC, see vercel.json). Developers only for now.
//
// each developer gets, in this order:
//   1. the bugs assigned to them that are still open (on top, most severe first)
//   2. how many bugs they resolved today, with the list
//   3. how many new bugs were opened today in each project
//
// a developer with nothing assigned, nothing resolved today and no new bugs
// anywhere is skipped, so nobody gets an empty email.
//
// the digest is not tied to one project, so it reads across every project
// and each bug row shows the name of the project it belongs to.
//
// "today" is the Asia/Karachi calendar day, not the server's day.
//
// the CRON_SECRET check lives in requireCronSecret so every cron route
// shares one validation path instead of duplicating it

import { userRepository } from '~~/server/repositories/userRepository'
import {
  dashboardRepository,
  DIGEST_ASSIGNED_LIMIT,
  type DigestBugRow,
  type DigestProjectCount
} from '~~/server/repositories/dashboardRepository'
import { sendDailyDigestEmail } from '~~/server/utils/email'
import { requireCronSecret } from '~~/server/utils/cronAuth'
import { karachiToday } from '~~/server/utils/karachiDate'

// bug titles and project names are typed by people, so they are escaped before going into the email html
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#b91c1c',
  High: '#c2410c',
  Medium: '#a16207',
  Low: '#4b5563'
}

function bugRowsHtml(bugs: DigestBugRow[], appUrl: string): string {
  return bugs
    .map((b) => {
      const bugCode = `BUG-${String(b.bug_number).padStart(3, '0')}`
      const color = SEVERITY_COLORS[b.severity] ?? '#4b5563'
      return `<li style="margin: 0 0 6px;">[${escapeHtml(b.project_name)}] <a href="${appUrl}/bugs/${b.id}">${bugCode}</a> &mdash; ${escapeHtml(b.title)} (<strong style="color: ${color};">${escapeHtml(b.severity)}</strong>, ${escapeHtml(b.status)})</li>`
    })
    .join('')
}

function sectionHeading(text: string): string {
  return `<h3 style="font-size: 15px; margin: 22px 0 8px;">${text}</h3>`
}

function projectCountsHtml(projects: DigestProjectCount[]): string {
  if (!projects.length) return '<p style="margin: 0; color: #6b7280;">No new bugs were opened today.</p>'
  const total = projects.reduce((sum, p) => sum + p.opened_today, 0)
  const items = projects
    .map((p) => `<li style="margin: 0 0 4px;">${escapeHtml(p.project_name)}: <strong>${p.opened_today}</strong></li>`)
    .join('')
  return `<p style="margin: 0 0 6px;">${total} new ${total === 1 ? 'bug' : 'bugs'} opened today across ${projects.length} ${projects.length === 1 ? 'project' : 'projects'}.</p><ul style="margin: 0; padding-left: 20px;">${items}</ul>`
}

export default defineEventHandler(async (event) => {
  requireCronSecret(event)

  const config = useRuntimeConfig()
  const appUrl = config.public.appUrl
  const today = karachiToday()

  const users = await userRepository.listActive()
  // Developers only for now. Admin, QA Lead and Tester get no digest.
  const developers = users.filter((u) => u.role === 'Developer')

  // the per project count is the same for everyone, so it is read once
  const newBugsByProject = await dashboardRepository.getDigestNewBugsByProject(today)

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const dev of developers) {
    try {
      const { bugs: assigned, totalCount: assignedTotal } = await dashboardRepository.getDigestAssignedBugs(
        dev.id,
        DIGEST_ASSIGNED_LIMIT
      )
      const resolved = await dashboardRepository.getDigestResolvedBugs(dev.id, today)

      if (assignedTotal === 0 && resolved.length === 0 && newBugsByProject.length === 0) {
        skipped += 1
        continue
      }

      const moreAssigned = assignedTotal - assigned.length
      const assignedHtml = assigned.length
        ? `<ul style="margin: 0; padding-left: 20px;">${bugRowsHtml(assigned, appUrl)}</ul>${
            moreAssigned > 0 ? `<p style="margin: 6px 0 0; color: #6b7280;">and ${moreAssigned} more in the app.</p>` : ''
          }`
        : '<p style="margin: 0; color: #6b7280;">You have no open bugs assigned to you.</p>'

      const resolvedHtml = resolved.length
        ? `<ul style="margin: 0; padding-left: 20px;">${bugRowsHtml(resolved, appUrl)}</ul>`
        : '<p style="margin: 0; color: #6b7280;">You have not resolved any bugs today.</p>'

      const html = `
        <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1f2937; max-width: 640px;">
          <h2 style="font-size: 18px; margin: 0 0 4px;">Your daily bug digest</h2>
          ${sectionHeading(`Assigned to you (${assignedTotal})`)}
          ${assignedHtml}
          ${sectionHeading(`Resolved by you today (${resolved.length})`)}
          ${resolvedHtml}
          ${sectionHeading('New bugs opened today, by project')}
          ${projectCountsHtml(newBugsByProject)}
        </div>
      `

      const delivered = await sendDailyDigestEmail(dev.email, {
        subject: `Your daily bug digest: ${assignedTotal} assigned, ${resolved.length} resolved today`,
        html
      })
      if (delivered) sent += 1
      else failed += 1
    } catch (err) {
      failed += 1
      console.error(`Failed to send daily digest to developer ${dev.id} (${dev.email})`, err)
    }
  }

  return { sent, skipped, failed }
})
