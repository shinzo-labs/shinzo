import { logger } from './logger'
import { FastifyReply } from 'fastify'
import crypto from 'crypto'
import { config } from './config'

type SendReply = {
  body: string | Record<string, any>
  reply: FastifyReply
  status?: number
  error?: boolean
}

export const sendReply = ({ body, status, error, reply }: SendReply) => {
  const statusCode = status ?? (error ? 400 : 200)
  const replyMessage = error
    ? { status: statusCode, error: body }
    : { status: statusCode, body }

  if (error) {
    logger.error({ statusCode, response: body })
  } else {
    logger.info({ statusCode, response: body })
  }

  reply.status(statusCode).send(replyMessage)
}

// ============================================================================
// Shinzo API Key Generation
// ============================================================================

export type KeyType = 'live' | 'test'

/**
 * Generates a Shinzo API key with the format: sk_shinzo_{type}_{random}
 * @param keyType - The type of key to generate ('live' or 'test')
 * @returns An object containing the full API key and its display prefix
 */
export function generateShinzoApiKey(keyType: KeyType = 'live'): {
  apiKey: string
  keyPrefix: string
} {
  // Generate 32 bytes of random data and convert to base62-like string
  const randomBytes = crypto.randomBytes(32)
  const randomString = randomBytes
    .toString('base64')
    .replace(/[+/=]/g, '')
    .substring(0, 42) // Take 42 characters for the random part

  const apiKey = `sk_shinzo_${keyType}_${randomString}`
  const keyPrefix = apiKey.substring(0, 20) // First 20 chars for display

  return { apiKey, keyPrefix }
}

// ============================================================================
// Provider Key Encryption/Decryption
// ============================================================================

/**
 * Gets the encryption key from environment config
 * Falls back to a default key for development (NEVER use in production)
 */
function getEncryptionKey(): Buffer {
  const encryptionKeyHex = config.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY

  if (!encryptionKeyHex) {
    // Development fallback - NEVER use this in production
    logger.warn('No ENCRYPTION_KEY found, using development fallback. DO NOT USE IN PRODUCTION!')
    return crypto.scryptSync('dev-fallback-key-change-in-prod', 'salt', 32)
  }

  return Buffer.from(encryptionKeyHex, 'hex')
}

/**
 * Encrypts a provider API key using AES-256-GCM
 * @param providerKey - The plain text provider API key to encrypt
 * @returns An object containing the encrypted key and IV
 */
export function encryptProviderKey(providerKey: string): {
  encryptedKey: string
  iv: string
} {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16) // 16 bytes IV for AES-256-GCM

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  let encryptedKey = cipher.update(providerKey, 'utf8', 'hex')
  encryptedKey += cipher.final('hex')

  // Get the authentication tag
  const authTag = cipher.getAuthTag()

  // Combine encrypted data with auth tag
  const combined = encryptedKey + authTag.toString('hex')

  return {
    encryptedKey: combined,
    iv: iv.toString('hex')
  }
}

/**
 * Decrypts a provider API key
 * @param encryptedKey - The encrypted key (includes auth tag)
 * @param iv - The initialization vector used for encryption
 * @returns The decrypted provider API key
 * @throws Error if decryption fails
 */
export function decryptProviderKey(encryptedKey: string, iv: string): string {
  const key = getEncryptionKey()
  const ivBuffer = Buffer.from(iv, 'hex')

  // Split encrypted data and auth tag (auth tag is last 32 hex chars = 16 bytes)
  const authTag = Buffer.from(encryptedKey.slice(-32), 'hex')
  const encryptedData = encryptedKey.slice(0, -32)

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer)
  decipher.setAuthTag(authTag)

  try {
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    logger.error({ message: 'Failed to decrypt provider key', error })
    throw new Error('Decryption failed - invalid key or corrupted data')
  }
}

/**
 * Extracts a display-safe prefix from a provider API key
 * @param providerKey - The provider API key
 * @param prefixLength - Number of characters to show (default: 10)
 * @returns The prefix for display purposes
 */
export function getProviderKeyPrefix(
  providerKey: string,
  prefixLength: number = 10
): string {
  return providerKey.substring(0, prefixLength)
}
