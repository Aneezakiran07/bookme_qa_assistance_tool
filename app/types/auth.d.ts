import type { User } from '#auth-utils'

declare module '#auth-utils' {
  interface User {
    id: number
    email: string
    role: 'Admin' | 'QA Lead' | 'Tester' | 'Developer'
    active: boolean
  }
}

export {}