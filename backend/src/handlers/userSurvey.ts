import * as yup from 'yup'
import { UserSurvey } from '../models'
import { logger } from '../logger'

export const saveSurveySchema = yup.object({
  usage_types: yup.array().of(yup.string()).min(1).required('At least one usage type is required'),
  role: yup.string().optional(),
  referral_sources: yup.array().of(yup.string()).optional(),
})

export const handleSaveUserSurvey = async (userUuid: string, requestData: any) => {
  try {
    logger.info({ message: 'Save user survey request', userUuid, data: requestData })

    const { usage_types, role, referral_sources } = requestData

    // Check if survey already exists for this user
    const existingSurvey = await UserSurvey.findOne({
      where: { user_uuid: userUuid }
    })

    if (existingSurvey) {
      return {
        status: 400,
        response: { error: 'Survey already exists for this user' }
      }
    }

    // Create new survey
    const survey = await UserSurvey.create({
      user_uuid: userUuid,
      usage_types,
      role,
      referral_sources,
    })

    logger.info({
      message: 'User survey saved successfully',
      userUuid,
      survey_uuid: survey.uuid
    })

    return {
      status: 201,
      response: {
        message: 'Survey created successfully',
        survey: {
          uuid: survey.uuid,
          usage_types: survey.usage_types,
          role: survey.role,
          referral_sources: survey.referral_sources,
          created_at: survey.created_at,
        }
      }
    }
  } catch (error: any) {
    logger.error({
      message: 'Error saving user survey',
      userUuid,
      error: error.message,
      stack: error.stack
    })

    return {
      status: 500,
      response: { error: 'Failed to save user survey' }
    }
  }
}

export const handleGetUserSurvey = async (userUuid: string) => {
  try {
    logger.info({ message: 'Get user survey request', userUuid })

    const survey = await UserSurvey.findOne({
      where: { user_uuid: userUuid }
    })

    logger.info({
      message: 'User survey retrieved successfully',
      userUuid,
      found: !!survey
    })

    if (!survey) {
      return {
        status: 200,
        response: { survey: null }
      }
    }

    return {
      status: 200,
      response: {
        survey: {
          uuid: survey.uuid,
          usage_types: survey.usage_types,
          role: survey.role,
          referral_sources: survey.referral_sources,
          created_at: survey.created_at,
        }
      }
    }
  } catch (error: any) {
    logger.error({
      message: 'Error retrieving user survey',
      userUuid,
      error: error.message,
      stack: error.stack
    })

    return {
      status: 500,
      response: { error: 'Failed to retrieve user survey' }
    }
  }
}
