import crypto from 'crypto'
import { Resource, Trace, Span, Metric } from '../models'
import { sequelize } from '../dbClient'
import { logger } from '../logger'

export interface AnonymizationMapping {
  original_value: string
  anonymized_value: string
  anonymization_type: 'pseudonym' | 'full'
  created_at: Date
}

// In-memory mapping store (in production, this should be a secure database table)
const anonymizationMappings = new Map<string, AnonymizationMapping>()

/**
 * Generate a consistent pseudonym using SHA-256 hashing with a salt
 */
export function generatePseudonym(value: string, salt: string = 'shinzo-default-salt'): string {
  const hash = crypto.createHmac('sha256', salt)
    .update(value)
    .digest('hex')
  return `anon_${hash.substring(0, 16)}`
}

/**
 * Generate a random anonymous ID (not reversible)
 */
export function generateAnonymousId(): string {
  return `anon_${crypto.randomBytes(16).toString('hex')}`
}

/**
 * Anonymize a user UUID across all data stores
 */
export async function anonymizeUserData(
  userUuid: string,
  anonymizationType: 'pseudonym' | 'full' = 'pseudonym',
  salt?: string
): Promise<{ success: boolean; anonymizedId: string; affectedRecords: number }> {
  const transaction = await sequelize.transaction()

  try {
    // Generate anonymized ID
    const anonymizedId = anonymizationType === 'pseudonym'
      ? generatePseudonym(userUuid, salt)
      : generateAnonymousId()

    // Store mapping if pseudonym (for potential reversal)
    if (anonymizationType === 'pseudonym') {
      anonymizationMappings.set(userUuid, {
        original_value: userUuid,
        anonymized_value: anonymizedId,
        anonymization_type: 'pseudonym',
        created_at: new Date()
      })
    }

    let affectedRecords = 0

    // Anonymize resources
    const [resourceCount] = await Resource.update(
      { user_uuid: anonymizedId },
      {
        where: { user_uuid: userUuid },
        transaction
      }
    )
    affectedRecords += resourceCount

    logger.info({
      message: 'User data anonymized',
      originalUuid: userUuid,
      anonymizedId,
      anonymizationType,
      affectedRecords
    })

    await transaction.commit()

    return {
      success: true,
      anonymizedId,
      affectedRecords
    }
  } catch (error) {
    await transaction.rollback()
    logger.error({ message: 'Failed to anonymize user data', error, userUuid })
    throw error
  }
}

/**
 * Batch anonymize multiple users
 */
export async function batchAnonymizeUsers(
  userUuids: string[],
  anonymizationType: 'pseudonym' | 'full' = 'pseudonym'
): Promise<{ success: number; failed: number; results: any[] }> {
  const results = []
  let successCount = 0
  let failedCount = 0

  for (const userUuid of userUuids) {
    try {
      const result = await anonymizeUserData(userUuid, anonymizationType)
      results.push({ userUuid, ...result })
      successCount++
    } catch (error) {
      results.push({ userUuid, success: false, error: (error as Error).message })
      failedCount++
    }
  }

  return {
    success: successCount,
    failed: failedCount,
    results
  }
}

/**
 * Reverse anonymization (only works for pseudonyms with stored mappings)
 */
export function reverseAnonymization(anonymizedId: string): string | null {
  for (const [originalId, mapping] of anonymizationMappings.entries()) {
    if (mapping.anonymized_value === anonymizedId && mapping.anonymization_type === 'pseudonym') {
      return originalId
    }
  }
  return null
}

/**
 * Get anonymization audit trail
 */
export function getAnonymizationAudit(): AnonymizationMapping[] {
  return Array.from(anonymizationMappings.values())
}

/**
 * Export anonymization mappings (for secure backup)
 */
export function exportAnonymizationMappings(): string {
  const mappings = Array.from(anonymizationMappings.entries()).map(([key, value]) => ({
    original: key,
    ...value
  }))
  return JSON.stringify(mappings, null, 2)
}

/**
 * Import anonymization mappings (from secure backup)
 */
export function importAnonymizationMappings(data: string): void {
  try {
    const mappings = JSON.parse(data)
    mappings.forEach((mapping: any) => {
      anonymizationMappings.set(mapping.original, {
        original_value: mapping.original_value,
        anonymized_value: mapping.anonymized_value,
        anonymization_type: mapping.anonymization_type,
        created_at: new Date(mapping.created_at)
      })
    })
    logger.info({ message: 'Anonymization mappings imported', count: mappings.length })
  } catch (error) {
    logger.error({ message: 'Failed to import anonymization mappings', error })
    throw error
  }
}
