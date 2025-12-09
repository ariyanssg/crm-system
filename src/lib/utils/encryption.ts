import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ''

export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 64) {
    console.warn('Encryption key not configured properly')
    return text
  }
  
  try {
    const iv = randomBytes(16)
    const cipher = createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Encryption error:', error)
    return text
  }
}

export function decrypt(text: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 64) {
    console.warn('Encryption key not configured properly')
    return text
  }
  
  try {
    const parts = text.split(':')
    if (parts.length !== 2) return text
    
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    const decipher = createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    return text
  }
}

export function isEncrypted(text: string): boolean {
  const parts = text.split(':')
  if (parts.length !== 2) return false
  return /^[a-f0-9]{32}$/.test(parts[0])
}
