import crypto from 'node:crypto'
import { requireRole } from '~~/server/utils/authorize'
import { useFirebaseAuth } from '~~/server/utils/firebaseAdmin'
import { userRepository } from '~~/server/repositories/userRepository'
import { invitationRepository } from '~~/server/repositories/invitationRepository'

const validRoles = ['Admin', 'QA Lead', 'Tester', 'Developer']
const INVITE_EXPIRY_DAYS = 7

// Admin/QA Lead invites someone by email + role. No password is set here --
// the invitee gets a Firebase "reset password" email (continueUrl carries
// mode=invite so the frontend can tell an invite apart from a genuine
// password reset) and either sets a password or continues with Google from
// the accept-invite page.
export default defineEventHandler(async (event) => {
  const currentUser = requireRole(event, ['Admin', 'QA Lead'])

  const body = await readBody<{ email?: string; role?: string }>(event)
  const email = body?.email?.trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'A valid email is required' })
  }
  if (!body?.role || !validRoles.includes(body.role)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid role' })
  }

  const existingUser = await userRepository.findByEmail(email)
  if (existingUser) {
    throw createError({ statusCode: 409, statusMessage: 'This email already has an account' })
  }

  const existingInvite = await invitationRepository.findActiveByEmail(email)
  if (existingInvite) {
    throw createError({ statusCode: 409, statusMessage: 'An outstanding invite already exists for this email' })
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  // create the Firebase user with no password -- they set one (or use
  // Google) when they accept the invite
  try {
    await useFirebaseAuth().createUser({ email })
  } catch (error) {
    console.error('[invitations] firebase createUser failed:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to create the invited account' })
  }

  const invitation = await invitationRepository.create({
    email,
    role: body.role,
    token,
    invitedBy: currentUser.id,
    expiresAt
  })

  const config = useRuntimeConfig()
  const continueUrl = `${config.public.appUrl}/accept-invite?token=${token}&mode=invite`

  try {
    await $fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${config.public.firebase.apiKey}`,
      {
        method: 'POST',
        body: {
          requestType: 'PASSWORD_RESET',
          email,
          continueUrl
        }
      }
    )
  } catch (error: any) {
    // ofetch puts the parsed Firebase error body here, this is what
    // actually has the error code like INVALID_CONTINUE_URI or API_KEY_INVALID
    const firebaseErrorBody = error?.data ?? error?.response?._data ?? null
    console.error('[invitations] sendOobCode failed:', JSON.stringify(firebaseErrorBody ?? error, null, 2))

    // the firebase user and invitation row were already created above, but
    // no email ever went out, so roll both back rather than leaving a row
    // that permanently blocks re-inviting this address
    await invitationRepository.deleteById(invitation.id)
    try {
      await useFirebaseAuth().deleteUser((await useFirebaseAuth().getUserByEmail(email)).uid)
    } catch (cleanupError) {
      console.error('[invitations] failed to clean up firebase user after sendOobCode failure:', cleanupError)
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send the invite email',
      data: firebaseErrorBody
    })
  }

  // never return the raw token -- it's a bearer credential for accepting
  // the invite
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    expires_at: invitation.expires_at
  }
})