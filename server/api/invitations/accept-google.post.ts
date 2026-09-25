import { useFirebaseAuth } from '~~/server/utils/firebaseAdmin'
import { invitationRepository, type InvitationRecord } from '~~/server/repositories/invitationRepository'
import { userRepository } from '~~/server/repositories/userRepository'

function isUsable(invitation: InvitationRecord | null): invitation is InvitationRecord {
  return (
    !!invitation &&
    !invitation.accepted_at &&
    !invitation.revoked_at &&
    new Date(invitation.expires_at).getTime() > Date.now()
  )
}

// public -- invitee continues with Google to accept the invite. The
// Firebase user for the invite's email was created password-less in
// index.post.ts; signing in with Google against that same email may
// reuse that uid, or Firebase may issue a different one (e.g. if Google
// sign-in provisions a separate identity) -- both are handled below.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ token?: string; idToken?: string }>(event)

  if (!body?.token) {
    throw createError({ statusCode: 400, statusMessage: 'Missing token' })
  }
  if (!body?.idToken) {
    throw createError({ statusCode: 400, statusMessage: 'Missing idToken' })
  }

  const invitation = await invitationRepository.findByToken(body.token)
  if (!isUsable(invitation)) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation not found or no longer valid' })
  }

  const firebaseAuth = useFirebaseAuth()

  let decoded
  try {
    decoded = await firebaseAuth.verifyIdToken(body.idToken)
  } catch (error) {
    console.error('[invitations/accept-google] verifyIdToken failed:', error)
    throw createError({ statusCode: 401, statusMessage: 'Invalid Firebase token' })
  }

  if (!decoded.email || decoded.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw createError({ statusCode: 403, statusMessage: 'This Google account does not match the invited email' })
  }

  const user = await userRepository.createFromInvitation({
    firebaseUid: decoded.uid,
    email: invitation.email,
    role: invitation.role,
    invitedBy: invitation.invited_by,
    invitedAt: invitation.created_at
  })

  await invitationRepository.markAccepted(invitation.id)

  return user
})
