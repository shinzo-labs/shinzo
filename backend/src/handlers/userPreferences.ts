import * as yup from 'yup'
import { UserPreferences } from '../models'
import { logger } from '../logger'

export const savePreferenceSchema = yup.object({
  preference_key: yup.string().required('Preference key is required'),
  preference_value: yup.mixed().required('Preference value is required'),
})

export const getPreferenceSchema = yup.object({
  preference_key: yup.string().optional(),
})

export const handleSaveUserPreference = async (userUuid: string, requestData: any) => {
  try {
    logger.info({ message: 'Save user preference request', userUuid, data: requestData })

    const { preference_key, preference_value } = requestData

    // Use upsert to either create or update the preference
    const [preference, created] = await UserPreferences.upsert({
      user_uuid: userUuid,
      preference_key,
      preference_value,
    })

    logger.info({
      message: 'User preference saved successfully',
      userUuid,
      preference_key,
      created
    })

    return {
      status: 200,
      response: {
        message: created ? 'Preference created successfully' : 'Preference updated successfully',
        preference: {
          uuid: preference.uuid,
          preference_key: preference.preference_key,
          preference_value: preference.preference_value,
          created_at: preference.created_at,
          updated_at: preference.updated_at,
        }
      }
    }
  } catch (error: any) {
    logger.error({
      message: 'Error saving user preference',
      userUuid,
      error: error.message,
      stack: error.stack
    })

    return {
      status: 500,
      response: { error: 'Failed to save user preference' }
    }
  }
}

export const handleGetUserPreferences = async (userUuid: string, requestQuery: any) => {
  try {
    logger.info({ message: 'Get user preferences request', userUuid, query: requestQuery })

    const { preference_key } = requestQuery

    let whereClause: any = { user_uuid: userUuid }

    if (preference_key) {
      whereClause.preference_key = preference_key
    }

    const preferences = await UserPreferences.findAll({
      where: whereClause,
      order: [['created_at', 'ASC']],
    })

    logger.info({
      message: 'User preferences retrieved successfully',
      userUuid,
      count: preferences.length
    })

    // If querying for a specific preference, return just that one
    if (preference_key && preferences.length > 0) {
      const preference = preferences[0]
      return {
        status: 200,
        response: {
          preference: {
            uuid: preference.uuid,
            preference_key: preference.preference_key,
            preference_value: preference.preference_value,
            created_at: preference.created_at,
            updated_at: preference.updated_at,
          }
        }
      }
    }

    // Otherwise return all preferences
    return {
      status: 200,
      response: {
        preferences: preferences.map(preference => ({
          uuid: preference.uuid,
          preference_key: preference.preference_key,
          preference_value: preference.preference_value,
          created_at: preference.created_at,
          updated_at: preference.updated_at,
        }))
      }
    }
  } catch (error: any) {
    logger.error({
      message: 'Error retrieving user preferences',
      userUuid,
      error: error.message,
      stack: error.stack
    })

    return {
      status: 500,
      response: { error: 'Failed to retrieve user preferences' }
    }
  }
}

export const handleDeleteUserPreference = async (userUuid: string, preferenceKey: string) => {
  try {
    logger.info({ message: 'Delete user preference request', userUuid, preferenceKey })

    const deletedCount = await UserPreferences.destroy({
      where: {
        user_uuid: userUuid,
        preference_key: preferenceKey,
      }
    })

    if (deletedCount === 0) {
      return {
        status: 404,
        response: { error: 'Preference not found' }
      }
    }

    logger.info({
      message: 'User preference deleted successfully',
      userUuid,
      preferenceKey
    })

    return {
      status: 200,
      response: { message: 'Preference deleted successfully' }
    }
  } catch (error: any) {
    logger.error({
      message: 'Error deleting user preference',
      userUuid,
      preferenceKey,
      error: error.message,
      stack: error.stack
    })

    return {
      status: 500,
      response: { error: 'Failed to delete user preference' }
    }
  }
}