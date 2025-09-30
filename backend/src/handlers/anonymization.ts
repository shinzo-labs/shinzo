import * as yup from 'yup'
import { logger } from '../logger'
import {
  anonymizeUserData,
  batchAnonymizeUsers,
  getAnonymizationAudit,
  reverseAnonymization,
  exportAnonymizationMappings,
  importAnonymizationMappings
} from '../services/anonymization'

export const anonymizeUserSchema = yup.object({
  user_uuid: yup.string().uuid('User UUID must be a valid UUID').required('User UUID is required'),
  anonymization_type: yup.string().oneOf(['pseudonym', 'full'], 'Invalid anonymization type').default('pseudonym'),
  salt: yup.string().optional()
}).required()

export const batchAnonymizeSchema = yup.object({
  user_uuids: yup.array().of(yup.string().uuid()).min(1, 'At least one user UUID is required').required(),
  anonymization_type: yup.string().oneOf(['pseudonym', 'full'], 'Invalid anonymization type').default('pseudonym')
}).required()

export const reverseAnonymizationSchema = yup.object({
  anonymized_id: yup.string().required('Anonymized ID is required')
}).required()

/**
 * Anonymize a single user's data
 */
export const handleAnonymizeUser = async (body: yup.InferType<typeof anonymizeUserSchema>) => {
  try {
    const result = await anonymizeUserData(
      body.user_uuid,
      body.anonymization_type as 'pseudonym' | 'full',
      body.salt
    )

    return {
      response: result,
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error anonymizing user', error })
    return {
      response: 'Error anonymizing user',
      error: true,
      status: 500
    }
  }
}

/**
 * Batch anonymize multiple users
 */
export const handleBatchAnonymizeUsers = async (body: yup.InferType<typeof batchAnonymizeSchema>) => {
  try {
    const result = await batchAnonymizeUsers(
      body.user_uuids,
      body.anonymization_type as 'pseudonym' | 'full'
    )

    return {
      response: result,
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error batch anonymizing users', error })
    return {
      response: 'Error batch anonymizing users',
      error: true,
      status: 500
    }
  }
}

/**
 * Reverse anonymization for a pseudonymized ID
 */
export const handleReverseAnonymization = async (body: yup.InferType<typeof reverseAnonymizationSchema>) => {
  try {
    const originalId = reverseAnonymization(body.anonymized_id)

    if (!originalId) {
      return {
        response: 'No mapping found for this anonymized ID or anonymization is not reversible',
        error: true,
        status: 404
      }
    }

    return {
      response: { original_id: originalId },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error reversing anonymization', error })
    return {
      response: 'Error reversing anonymization',
      error: true,
      status: 500
    }
  }
}

/**
 * Get anonymization audit trail
 */
export const handleGetAnonymizationAudit = async () => {
  try {
    const audit = getAnonymizationAudit()

    return {
      response: audit,
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error fetching anonymization audit', error })
    return {
      response: 'Error fetching anonymization audit',
      error: true,
      status: 500
    }
  }
}

/**
 * Export anonymization mappings
 */
export const handleExportMappings = async () => {
  try {
    const mappings = exportAnonymizationMappings()

    return {
      response: { mappings },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error exporting anonymization mappings', error })
    return {
      response: 'Error exporting anonymization mappings',
      error: true,
      status: 500
    }
  }
}

/**
 * Import anonymization mappings
 */
export const handleImportMappings = async (mappingsData: string) => {
  try {
    importAnonymizationMappings(mappingsData)

    return {
      response: { success: true, message: 'Mappings imported successfully' },
      status: 200
    }
  } catch (error) {
    logger.error({ message: 'Error importing anonymization mappings', error })
    return {
      response: 'Error importing anonymization mappings',
      error: true,
      status: 500
    }
  }
}
