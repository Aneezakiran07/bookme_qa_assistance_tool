import { neon } from '@neondatabase/serverless'

// this creates one shared sql tagged-template client for the whole app
// every repository imports this instead of opening its own connection
let sqlClient: ReturnType<typeof neon> | null = null

export function useDb() {
  if (!sqlClient) {
    const config = useRuntimeConfig()
    sqlClient = neon(config.databaseUrl)
  }
  return sqlClient
}
