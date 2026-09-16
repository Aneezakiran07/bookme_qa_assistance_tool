import { userRepository } from '~~/server/repositories/userRepository'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.currentUser
  const moduleIds = await userRepository.listModuleIdsForUser(currentUser.id)
  return { moduleIds }
})
