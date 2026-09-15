// this runs before every server api call and blocks anyone who is not
// an active, approved user, except for the small set of public routes
// listed below (auth flow, session check, and the pending status check)
const publicPaths = [
  '/api/auth/session',
  '/api/_auth/session',
  '/api/me'
]

export default defineEventHandler(async (event) => {
  const path = event.path || ''
  if (!path.startsWith('/api/')) return
  if (publicPaths.some((p) => path.startsWith(p))) return

  const session = await getUserSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Not signed in' })
  }
  if (!session.user.active) {
    throw createError({ statusCode: 403, statusMessage: 'Account pending approval' })
  }

  event.context.currentUser = session.user
})
