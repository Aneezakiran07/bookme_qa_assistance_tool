import { neon } from '@neondatabase/serverless'

type SqlFn = {
  <T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<T[]>
  <T = any>(query: string, ...values: any[]): Promise<T[]>
  transaction(queries: Promise<any[]>[]): Promise<any[][]>
}

let sqlClient: SqlFn | null = null

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await run()
    } catch (e) {
      if (i >= 2) throw e
      await wait(1000 * (i + 1))
    }
  }
}

export function useDb(): SqlFn {
  if (!sqlClient) {
    const raw = neon(useRuntimeConfig().databaseUrl) as any
    const wrapped: any = (...args: any[]) => withRetry(() => raw(...args))
    wrapped.transaction = (q: any) => raw.transaction(q)
    sqlClient = wrapped
  }
  return sqlClient!
}