import crypto from 'node:crypto'
import { userRepository } from '~~/server/repositories/userRepository'
import { passwordResetRepository } from '~~/server/repositories/passwordResetRepository'
import { sendPasswordResetEmail } from '~~/server/utils/email'

const RESET_EXPIRY_MINUTES = 60
const MAX_RESETS_PER_HOUR = 3
// every answer takes at least this long, so a reply cannot reveal
// whether the email has an account
const MIN_RESPONSE_MS = 1500
// public. always answers the same way with the same timing, whether or not
// the email has an account, so it cannot be used to find out who is a user
// all the real work runs after the response goes out
async function createAndSendReset(email: string): Promise<void> {
  try {
    const user = await userRepository.findByEmail(email)
    if (!user || !user.active) return

    const recent = await passwordResetRepository.countRecentForUser(user.id, 60)
    if (recent >= MAX_RESETS_PER_HOUR) return

    await passwordResetRepository.markOpenAsUsedForUser(user.id)

    // only the hash is stored, the raw token only ever lives in the email link
    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    await passwordResetRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000)
    })

    const config = useRuntimeConfig()
    await sendPasswordResetEmail(user.email, `${config.public.appUrl}/reset-password?token=${token}`)
  } catch (error) {
    console.error('[auth/forgot-password] failed to create or send a reset:', error)
  }
}


export default defineEventHandler(async (event) => {
  const startedAt = Date.now()
  const body = await readBody<{ email?: string }>(event)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (email) {
    // the work now finishes before the response goes out, since serverless
    // functions can be paused as soon as a response is sent
    await createAndSendReset(email)
  }

  const remaining = MIN_RESPONSE_MS - (Date.now() - startedAt)
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining))
  }

  return { success: true }
})