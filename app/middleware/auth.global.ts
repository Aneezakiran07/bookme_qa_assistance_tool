// runs on every route, before any page-specific middleware (like
// manage-users), because .global.ts middleware always executes first and
// in file-name order. this is the one place that decides whether someone
// is allowed to see a page at all, based on their session state:
//
//   no session at all         -> only /login is reachable
//   session but not active    -> only /pending-approval is reachable
//   session and active        -> everything except /login is reachable,
//                                 and /pending-approval bounces to /
//
// running as global middleware (not per-page) means this also covers SSR:
// nuxt-auth-utils resolves the session from the request cookie before
// middleware runs, so there's no flash of a broken "unknown user" page
// before the redirect kicks in.

const ONLY_FOR_SIGNED_OUT = ['/login']
const ONLY_FOR_PENDING = ['/pending-approval']

export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()

  const isSignedOutRoute = ONLY_FOR_SIGNED_OUT.includes(to.path)
  const isPendingRoute = ONLY_FOR_PENDING.includes(to.path)

  // not signed in at all: only the login page is allowed
  if (!loggedIn.value) {
    if (!isSignedOutRoute) {
      return navigateTo('/login')
    }
    return
  }

  // signed in, but an admin hasn't approved a role + activated them yet:
  // only the "waiting for approval" page is allowed
  if (!user.value?.active) {
    if (!isPendingRoute) {
      return navigateTo('/pending-approval')
    }
    return
  }

  // signed in and active: never show them the login or pending screens again
  if (isSignedOutRoute || isPendingRoute) {
    return navigateTo('/')
  }

  // developers get a focused bug workspace only, they never get the full
  // test case or execution suites, so send them back to the dashboard
  // with a query flag if they try to reach those routes directly. a
  // toast can't be fired from here because the toast service may not be
  // mounted yet during middleware, so the dashboard watches for this
  // flag on mount and fires the toast itself
  const isDeveloper = user.value?.role === 'Developer'
  const isTestCaseRoute = to.path.startsWith('/test-cases')
  const isExecutionRoute = to.path.startsWith('/executions')

  if (isDeveloper && (isTestCaseRoute || isExecutionRoute)) {
    return navigateTo('/?denied=developer-role')
  }
})