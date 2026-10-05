// sets or replaces a password for an existing user, used to bootstrap the
// first admin before email delivery works
// run it with DATABASE_URL set in the environment and the email as the only argument
import bcrypt from 'bcryptjs'
import { neon } from '@neondatabase/serverless'

const email = (process.argv[2] || '').trim().toLowerCase()
if (!email) {
  console.error('Usage: node scripts/set-password.mjs <email>')
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

// reads a line from the terminal without echoing the characters
function promptHidden(question) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error('This script needs an interactive terminal'))
      return
    }
    process.stdout.write(question)
    let value = ''
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    const onData = (char) => {
      if (char === '\u0003') {
        process.stdout.write('\n')
        process.exit(1)
      } else if (char === '\r' || char === '\n') {
        process.stdin.setRawMode(false)
        process.stdin.pause()
        process.stdin.removeListener('data', onData)
        process.stdout.write('\n')
        resolve(value)
      } else if (char === '\u007f' || char === '\b') {
        value = value.slice(0, -1)
      } else {
        value += char
      }
    }
    process.stdin.on('data', onData)
  })
}

const password = await promptHidden('New password: ')
const confirm = await promptHidden('Repeat password: ')

if (password !== confirm) {
  console.error('Passwords do not match')
  process.exit(1)
}
if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
  console.error('Password must be 8 characters or more and at most 72 bytes')
  process.exit(1)
}

const hash = await bcrypt.hash(password, 10)
const sql = neon(process.env.DATABASE_URL)
const rows = await sql`
  update users set password_hash = ${hash}, failed_login_attempts = 0, locked_until = null
  where lower(email) = ${email}
  returning id, email
`

if (!rows.length) {
  console.error(`No user found with email ${email}`)
  process.exit(1)
}
console.log(`Password updated for ${rows[0].email}`)
