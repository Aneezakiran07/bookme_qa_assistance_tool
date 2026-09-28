import crypto from 'node:crypto'
import { requireRole } from '~~/server/utils/authorize'
import { useFirebaseAuth } from '~~/server/utils/firebaseAdmin'
import { userRepository } from '~~/server/repositories/userRepository'
import { invitationRepository } from '~~/server/repositories/invitationRepository'

const validRoles = ['Admin', 'QA Lead', 'Tester', 'Developer']
const INVITE_EXPIRY_DAYS = 7

// admin or qa lead invites someone by email and role
// no password is set here, firebase sends the invitee a password reset
// style email and the invitee sets their own password from that link
// the login step finishes creating their account in this app
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

  // create the firebase user with no password, the invitee sets one from
  // the emailed link or signs in with google
  let createdFirebaseUser = true
  try {
    await useFirebaseAuth().createUser({ email })
  } catch (error) {
    // a firebase user can be left over from an earlier invite that was
    // revoked or failed, and it is safe to reuse because this email has
    // no account in this app and no live invite, both checked above
    if ((error as any)?.code !== 'auth/email-already-exists') {
      console.error('[invitations] firebase createUser failed:', error)
      throw createError({ statusCode: 500, statusMessage: 'Failed to create the invited account' })
    }
    createdFirebaseUser = false
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
    // ofetch puts the parsed firebase error body here, it holds the real
    // reason such as INVALID_CONTINUE_URI or API_KEY_INVALID
    const firebaseErrorBody = error?.data ?? error?.response?._data ?? null
    console.error('[invitations] sendOobCode failed:', JSON.stringify(firebaseErrorBody ?? String(error), null, 2))

    // no email went out, so remove the invite row, and remove the firebase
    // user too when this request was the one that created it
    await invitationRepository.deleteById(invitation.id)
    if (createdFirebaseUser) {
      try {
        const leftover = await useFirebaseAuth().getUserByEmail(email)
        await useFirebaseAuth().deleteUser(leftover.uid)
      } catch (cleanupError) {
        console.error('[invitations] failed to clean up firebase user after sendOobCode failure:', cleanupError)
      }
    }

    throw createError({ statusCode: 500, statusMessage: 'Failed to send the invite email' })
  }

  // never return the raw token, it is a bearer credential for the invite
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    expires_at: invitation.expires_at
  }
})
