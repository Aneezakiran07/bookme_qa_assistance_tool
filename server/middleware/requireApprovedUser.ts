// this runs before every server api call and blocks anyone who is not
// signed in and active, except for the small set of public routes
// listed below (login, session check, and the invite routes)
const publicPaths = [
  '/api/auth/session',
  '/api/_auth/session',
  '/api/me',
  '/api/invitations/validate',
  '/api/invitations/accept-google',
  '/api/invitations/finalize'
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
    throw createError({ statusCode: 403, statusMessage: 'Your account has been deactivated' })
  }

  event.context.currentUser = session.user
})
