import { requireRole } from '~~/server/utils/authorize'
import { userRepository } from '~~/server/repositories/userRepository'
import { invitationRepository } from '~~/server/repositories/invitationRepository'

// single call the admin page uses to render both tables. There's no more
// "pending" user state under invite-only onboarding -- a person is either
// an active team member, or an outstanding (not yet accepted) invitation.
// Admin and QA Lead both get this (same tier, two labels).
export default defineEventHandler(async (event) => {
  requireRole(event, ['Admin', 'QA Lead'])

  const [active, invitations] = await Promise.all([
    userRepository.listActive(),
    invitationRepository.listOutstanding()
  ])

  return { active, invitations }
})