import { userRepository } from '~~/server/repositories/userRepository'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)

  // No session → nothing to sync, let the next middleware handle it
  if (!session?.user?.id) return

  const freshUser = await userRepository.findById(session.user.id)

  // User was deleted from the DB but their cookie still exists → clear it
  if (!freshUser) {
    await clearUserSession(event)
    return
  }

  // Only rewrite the cookie if something meaningful changed, so we don't
  // touch the DB on every request for steady-state users
  const roleChanged = freshUser.role !== session.user.role
  const activeChanged = freshUser.active !== session.user.active

  if (roleChanged || activeChanged) {
    await setUserSession(event, {
      user: {
        id: freshUser.id,
        email: freshUser.email,
        role: freshUser.role,
        active: freshUser.active,
      },
    })
  }
})