import { useDb } from '~~/server/db/client'

export default defineEventHandler(async () => {
  await useDb()`SELECT 1`
  return { ok: true }
})