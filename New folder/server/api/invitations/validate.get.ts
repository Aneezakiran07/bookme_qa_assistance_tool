import { invitationRepository } from '~~/server/repositories/invitationRepository'

// public -- the accept-invite page calls this before showing the form.
// returns just enough to render the page (email + role), never the token
// itself back, and 404s for anything that isn't a live, usable invite so
// the frontend can't distinguish "expired" from "revoked" from "wrong
// token" (no information leak either way)
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const token = typeof query.token === 'string' ? query.token : ''

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Missing token' })
  }

  const invitation = await invitationRepository.findByToken(token)

  const isUsable =
    invitation &&
    !invitation.accepted_at &&
    !invitation.revoked_at &&
    new Date(invitation.expires_at).getTime() > Date.now()

  if (!isUsable) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation not found or no longer valid' })
  }

  return { email: invitation.email, role: invitation.role }
})
