import { setUserSession } from '#imports'
import { useFirebaseAuth } from '~~/server/utils/firebaseAdmin'
import { onboardingService } from '~~/server/services/onboardingService'


// the frontend signs the user in with Firebase, gets an ID token, and posts
// it here, this route is the only one allowed to trust that token
export default defineEventHandler(async (event) => {
  const body = await readBody<{ idToken: string }>(event)
  if (!body?.idToken) {
    throw createError({ statusCode: 400, statusMessage: 'Missing idToken' })
  }

  let decoded
  try {
    decoded = await useFirebaseAuth().verifyIdToken(body.idToken)
  } catch (error) {
    console.error('[auth/session] Firebase token verification failed:', error)
    throw createError({ statusCode: 401, statusMessage: 'Invalid Firebase token' })
  }

  if (!decoded.email) {
    throw createError({ statusCode: 400, statusMessage: 'Google account has no email' })
  }

  let appUser
  try {
    appUser = await onboardingService.resolveLogin(decoded.uid, decoded.email, decoded.email_verified === true)
  } catch (error) {
    // logging the real database or firebase error here instead of letting
    // it bubble up as a bare 500 is what lets us see the actual cause
    console.error('[auth/session] onboardingService.resolveLogin failed:', error)
    // expected refusals such as not invited keep their own status and
    // message so the login page can show the real reason
    const status = (error as any)?.statusCode
    if (typeof status === 'number' && status >= 400 && status < 500) {
      throw error
    }
    throw createError({ statusCode: 500, statusMessage: 'Failed to resolve user account' })
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