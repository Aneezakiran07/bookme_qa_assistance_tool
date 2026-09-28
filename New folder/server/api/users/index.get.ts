import { userRepository } from '~~/server/repositories/userRepository'

// returns every active (approved) user, for assignee dropdowns —
// pending users are excluded since they can't be assigned anything yet
export default defineEventHandler(async () => {
  const users = await userRepository.listActive()
  return users.map((u) => ({ id: u.id, email: u.email, role: u.role }))
})
