import bcrypt from 'bcryptjs'

// cost factor ten is a good balance of speed and safety on serverless
const COST_FACTOR = 10

export const PASSWORD_MIN_LENGTH = 8
// bcrypt ignores everything past 72 bytes so longer passwords are refused
export const PASSWORD_MAX_BYTES = 72

// a real bcrypt hash of a random value nobody knows, used to burn the same
// time as a real check when the email does not exist
export const DUMMY_PASSWORD_HASH = '$2b$10$3DhR5nijJ5Dg6bFtA5emcuzRZ0PBWmErJhDLnv5v76a4kOFyTg0Iy'

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST_FACTOR)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

// returns a readable problem or null when the password is acceptable
export function passwordProblem(plain: unknown): string | null {
  if (typeof plain !== 'string' || plain.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  }
  if (Buffer.byteLength(plain, 'utf8') > PASSWORD_MAX_BYTES) {
    return `Password must be at most ${PASSWORD_MAX_BYTES} bytes long`
  }
  return null
}

// every route that sets a password calls this first
export function assertPasswordRules(plain: unknown): asserts plain is string {
  const problem = passwordProblem(plain)
  if (problem) {
    throw createError({ statusCode: 400, statusMessage: problem })
  }
}
