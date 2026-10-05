import crypto from 'node:crypto'
import { userRepository } from '~~/server/repositories/userRepository'
import { passwordResetRepository } from '~~/server/repositories/passwordResetRepository'

// public. the reset page calls this before showing the form
// any link that is not valid gets the same 404
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const token = typeof query.token === 'string' ? query.token : ''

  if (!token) {
    throw createError({ statusCode: 404, statusMessage: 'Reset link not found or no longer valid' })
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const reset = await passwordResetRepository.findValidByHash(tokenHash)
  const user = reset ? await userRepository.findById(reset.user_id) : null

  if (!reset || !user || !user.active) {
    throw createError({ statusCode: 404, statusMessage: 'Reset link not found or no longer valid' })
  }

  return { email: user.email }
})
