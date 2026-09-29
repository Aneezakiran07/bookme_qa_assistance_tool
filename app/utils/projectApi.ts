// the api routes that need the project id header, matched by prefix
// everything else is left alone, that means projects, profile, users, admin, invitations, auth, me and cron
const PROJECT_SCOPED_API_PREFIXES = [
  '/api/modules',
  '/api/releases',
  '/api/requirements',
  '/api/test-cases',
  '/api/executions',
  '/api/bugs',
  '/api/developer',
  '/api/dashboard'
]

// this one bugs route exists to find the project, so it must not send the header
const LOCATE_BUG_PATTERN = /^\/api\/bugs\/[^/]+\/locate$/

// takes a request url or path and says whether the server expects a project header for it
export function isProjectScopedApiPath(url: string): boolean {
  const path = url.split('?')[0]?.split('#')[0] ?? ''
  if (LOCATE_BUG_PATTERN.test(path)) return false
  return PROJECT_SCOPED_API_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}
