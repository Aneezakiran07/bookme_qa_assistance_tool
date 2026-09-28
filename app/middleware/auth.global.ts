// runs on every route, before any page specific middleware (like
// manage-users), because .global.ts middleware always executes first and
// in file name order. this is the one place that decides whether someone
// is allowed to see a page at all, based on their session state.
//
// no session, or a deactivated account: only the public pages are reachable
// active session: everything except the login page is reachable
//
// running as global middleware (not per page) means this also covers SSR,
// nuxt-auth-utils resolves the session from the request cookie before
// middleware runs, so there is no flash of a broken unknown user page
// before the redirect kicks in

const ONLY_FOR_SIGNED_OUT = ['/login']
// pages a signed out person must be able to open, the invite page is reached
// from an emailed link before the person has any session at all
const PUBLIC_WHEN_SIGNED_OUT = ['/login', '/accept-invite', '/forgot-password']

export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()

  const isPublicRoute = PUBLIC_WHEN_SIGNED_OUT.includes(to.path)

  // not signed in, or signed in but deactivated: only the public pages are
  // allowed. carry the page they were trying to reach so login can send them
  // straight back after signing in, and a reason flag so the login page can
  // show a please log in message instead of silently landing there
  if (!loggedIn.value || !user.value?.active) {
    if (!isPublicRoute) {
      return navigateTo({ path: '/login', query: { redirect: to.fullPath, reason: 'auth' } })
    }
    return
  }

  // signed in and active: never show them the login screen again
  if (ONLY_FOR_SIGNED_OUT.includes(to.path)) {
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
