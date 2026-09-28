import { bugRepository } from '~~/server/repositories/bugRepository'

export default defineEventHandler(async () => {
  return bugRepository.metrics()
})
