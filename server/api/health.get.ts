import { useDb } from '~~/server/utils/db'

export default defineEventHandler(async () => {
  await useDb()`SELECT 1`
  return { ok: true }
})