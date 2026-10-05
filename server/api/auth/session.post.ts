import { userRepository } from '~~/server/repositories/userRepository'
import { verifyPassword, DUMMY_PASSWORD_HASH } from '~~/server/utils/password'

// signs a person in with email and password and sets the session cookie
// this is the only route that checks a password for login
export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string; password?: string }>(event)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Email and password are required' })
  }

  const authUser = await userRepository.findAuthByEmail(email)

  // an unknown email or an account with no password yet still pays for a
  // bcrypt compare, so response time does not reveal whether the email exists
  if (!authUser || !authUser.password_hash) {
    await verifyPassword(password, DUMMY_PASSWORD_HASH)
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
  }

  // this slightly reveals that the account exists, which is an accepted trade off
  if (authUser.locked_until && new Date(authUser.locked_until).getTime() > Date.now()) {
    throw createError({ statusCode: 429, statusMessage: 'Too many attempts. Try again later.' })
  }

  const passwordOk = await verifyPassword(password, authUser.password_hash)
  if (!passwordOk) {
    await userRepository.recordLoginFailure(authUser.id)
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
  }

  // a deactivated account never gets a session cookie
  if (!authUser.active) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Your account has been deactivated. Please contact an admin.'
    })
  }

  const appUser = await userRepository.recordLoginSuccess(authUser.id)
  if (!appUser) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
  }

  try {
    await setUserSession(event, {
      user: {
        id: appUser.id,
        email: appUser.email,
        role: appUser.role,
        active: appUser.active
      }
    })
  } catch (error) {
    console.error('[auth/session] setUserSession failed:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to create session' })
  }

  return appUser
})
