import { userRepository } from '~~/server/repositories/userRepository'
import { VALID_AVATAR_IDS } from '~~/server/utils/avatarIds'

// saves the editable part of a user's own profile: display name and/or
// avatar. a user can only ever update their own row, there is no id in
// the body or the url, the target is always whoever the session says is
// signed in.
//
// both fields are optional in the request so the avatar picker can save
// just the avatar the instant someone clicks one, without also having
// to resend (and risk clobbering) the display name, and vice versa --
// whichever field is missing from the body keeps its current value
// rather than getting wiped.
export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser

  const body = await readBody<{ displayName?: string | null; avatarId?: string }>(event)

  const existing = await userRepository.findById(currentUser.id)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const displayName = body?.displayName !== undefined ? body.displayName?.trim() || null : existing.display_name

  let avatarId = existing.avatar_id
  if (body?.avatarId !== undefined) {
    if (!VALID_AVATAR_IDS.includes(body.avatarId)) {
      throw createError({ statusCode: 400, statusMessage: 'Unknown avatar' })
    }
    avatarId = body.avatarId
  }

  const updated = await userRepository.updateProfile(currentUser.id, { displayName, avatarId })

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  return {
    id: updated.id,
    email: updated.email,
    role: updated.role,
    displayName: updated.display_name,
    avatarId: updated.avatar_id
  }
})
