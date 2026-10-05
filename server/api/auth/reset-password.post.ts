import crypto from 'node:crypto'
import { userRepository } from '~~/server/repositories/userRepository'
import { passwordResetRepository } from '~~/server/repositories/passwordResetRepository'
import { assertPasswordRules, hashPassword } from '~~/server/utils/password'

// public. sets a new password from an emailed reset link, the link works once
// this does not sign the person in, the page sends them to the login screen
export default defineEventHandler(async (event) => {
  const body = await readBody<{ token?: string; password?: string }>(event)

  if (!body?.token || typeof body.token !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing token' })
  }
  assertPasswordRules(body.password)

  const tokenHash = crypto.createHash('sha256').update(body.token).digest('hex')
  const reset = await passwordResetRepository.findValidByHash(tokenHash)
  const user = reset ? await userRepository.findById(reset.user_id) : null

  if (!reset || !user || !user.active) {
    throw createError({ statusCode: 404, statusMessage: 'Reset link not found or no longer valid' })
  }

  // the conditional update means two requests with the same link cannot both win
  const claimed = await passwordResetRepository.markUsedIfOpen(reset.id)
  if (!claimed) {
    throw createError({ statusCode: 404, statusMessage: 'Reset link not found or no longer valid' })
  }

  await userRepository.setPasswordHash(user.id, await hashPassword(body.password))

  return { success: true }
})
