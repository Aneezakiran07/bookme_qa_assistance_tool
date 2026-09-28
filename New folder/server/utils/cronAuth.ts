import type { H3Event } from 'h3'

// shared by every cron route (daily-snapshot, daily-digest, and any
// future one) so the CRON_SECRET check only lives in one place. Vercel
// Cron always calls these with GET and no way to set a custom header on
// some plans, so the secret is accepted either as a Bearer header or a
// ?secret= query param.
export function requireCronSecret(event: H3Event) {
  const config = useRuntimeConfig()

  const authHeader = getHeader(event, 'authorization')
  const headerSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
  const querySecret = getQuery(event).secret as string | undefined
  const providedSecret = headerSecret ?? querySecret

  if (!providedSecret || providedSecret !== config.cronSecret) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
}
