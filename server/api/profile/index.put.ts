import { userRepository } from '~~/server/repositories/userRepository'

// saves the editable part of a user's own profile: display name and the
// two notification toggles. a user can only ever update their own row,
// there is no id in the body or the url, the target is always whoever
// the session says is signed in.
//
// this only persists the preference state for now. nothing reads
// email_notifications or daily_digest_enabled yet, the actual send
// logic gets wired up to check these flags at the very end.
export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser

  const body = await readBody<{
    displayName?: string | null
    emailNotifications?: boolean
    dailyDigestEnabled?: boolean
  }>(event)

  const displayName = body?.displayName?.trim() || null

  if (typeof body?.emailNotifications !== 'boolean' || typeof body?.dailyDigestEnabled !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'Both preference toggles are required' })
  }

  const updated = await userRepository.updateProfile(currentUser.id, {
    displayName,
    emailNotifications: body.emailNotifications,
    dailyDigestEnabled: body.dailyDigestEnabled
  })

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  return {
    id: updated.id,
    email: updated.email,
    role: updated.role,
    displayName: updated.display_name,
    emailNotifications: updated.email_notifications,
    dailyDigestEnabled: updated.daily_digest_enabled
  }
})
