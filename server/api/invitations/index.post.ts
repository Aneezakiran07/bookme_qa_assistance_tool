import crypto from 'node:crypto'
import { requireRole } from '~~/server/utils/authorize'
import { userRepository } from '~~/server/repositories/userRepository'
import { invitationRepository } from '~~/server/repositories/invitationRepository'
import { sendInviteEmail } from '~~/server/utils/email'

const validRoles = ['Admin', 'QA Lead', 'Tester', 'Developer']
const INVITE_EXPIRY_DAYS = 7

// admin or qa lead invites someone by email and role
// no password is set here, the invitee opens the emailed link and sets
// their own password on the accept invite page
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
    throw createError({
      statusCode: 409,
      statusMessage: existingUser.active
        ? 'This email already has an account'
        : 'This email belongs to a deactivated account. Activate it from the Team page instead'
    })
  }

  const existingInvite = await invitationRepository.findActiveByEmail(email)
  if (existingInvite) {
    throw createError({ statusCode: 409, statusMessage: 'An outstanding invite already exists for this email' })
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  const invitation = await invitationRepository.create({
    email,
    role: body.role,
    token,
    invitedBy: currentUser.id,
    expiresAt
  })

  const config = useRuntimeConfig()
  const inviteUrl = `${config.public.appUrl}/accept-invite?token=${token}`

  // the row is kept even when the email fails so an admin can resend it later
  const emailSent = await sendInviteEmail(email, inviteUrl)

  // never return the raw token, it is a bearer credential for the invite
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    expires_at: invitation.expires_at,
    emailSent
  }
})
