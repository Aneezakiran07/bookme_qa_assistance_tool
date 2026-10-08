import type { H3Event } from 'h3'

// single place that decides what "requires role X" means
// every route that needs a role check calls this instead of inlining checks
export function requireRole(event: H3Event, allowedRoles: string[]) {
  const currentUser = event.context.currentUser
  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Insufficient role' })
  }
  return currentUser
}

// the QA workspace is requirements, test cases, executions and releases
// a Developer works from the dashboard and the bug queue only, so every
// route in that workspace uses this list on the server too, not just the menu
export const QA_WORKSPACE_ROLES = ['Admin', 'QA Lead', 'Tester']
