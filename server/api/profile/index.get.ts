import { userRepository } from '~~/server/repositories/userRepository'

// returns the full profile row for whoever is signed in, used by the
// /profile page instead of the session cookie because the session only
// carries id/email/role/active, not display name or preference flags
export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser

  const user = await userRepository.findById(currentUser.id)
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.display_name,
    emailNotifications: user.email_notifications,
    dailyDigestEnabled: user.daily_digest_enabled
  }
})
