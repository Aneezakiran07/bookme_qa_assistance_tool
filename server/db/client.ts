import { neon } from '@neondatabase/serverless'

// The neon driver's raw return type is a three-way union
// (`any[][] | Record<string, any>[] | FullQueryResults<boolean>`),
// which forces every call site to defend against shapes we never
// actually produce. We always use the default mode, so we cast the
// client to the plain-array form once, here. Every `sql\`...\`` then
// returns `Promise<T[]>`, and `rows[0]` / `.map` / `.length` work
// everywhere without per-call casts.
type SqlFn = {
  <T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<T[]>
  <T = any>(query: string, ...values: any[]): Promise<T[]>
  // runs the given queries in one transaction, so either all apply or none do
  transaction(queries: Promise<any[]>[]): Promise<any[][]>
}

let sqlClient: SqlFn | null = null

export function useDb(): SqlFn {
  if (!sqlClient) {
    const config = useRuntimeConfig()
    sqlClient = neon(config.databaseUrl) as unknown as SqlFn
  }
  return sqlClient
}