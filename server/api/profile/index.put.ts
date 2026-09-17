import { userRepository } from '~~/server/repositories/userRepository'

// saves the editable part of a user's own profile, which is just the
// display name now. a user can only ever update their own row, there
// is no id in the body or the url, the target is always whoever the
// session says is signed in.
export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser

  const body = await readBody<{ displayName?: string | null }>(event)
  const displayName = body?.displayName?.trim() || null

  const updated = await userRepository.updateProfile(currentUser.id, { displayName })

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  return {
    id: updated.id,
    email: updated.email,
    role: updated.role,
    displayName: updated.display_name
  }
})