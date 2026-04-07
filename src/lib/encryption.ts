import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getEncryptionKey(): Buffer {
  const keyHex = process.env.META_ENCRYPTION_KEY
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('META_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate with: openssl rand -hex 32')
  }
  return Buffer.from(keyHex, 'hex')
}

const KEY = getEncryptionKey()

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':')
}

export function decrypt(ciphertext: string): string {
  const [ivB64, authTagB64, encryptedB64] = ciphertext.split(':')
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const encrypted = Buffer.from(encryptedB64, 'base64')
  const decipher = createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
