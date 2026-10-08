// gives a short line to show under a password box. it is only a hint,
// the server still only requires 8 to 72 characters
export function passwordStrength(password: string): { strong: boolean; message: string } | null {
  if (!password) return null

  const missing: string[] = []
  if (password.length < 8) missing.push('use at least 8 characters')
  if (!/[a-z]/.test(password)) missing.push('add a small letter')
  if (!/[A-Z]/.test(password)) missing.push('add a capital letter')
  if (!/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password)) {
    missing.push('add a number or a special character')
  }

  if (missing.length === 0) return { strong: true, message: 'Strong password' }
  const text = missing.join(', ')
  return { strong: false, message: `Weak password: ${text}` }
}
