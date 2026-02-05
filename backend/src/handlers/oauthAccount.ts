import { User, OAuthAccount } from '../models'
import { logger } from '../logger'

/**
 * Get user's available authentication methods
 * Returns which auth methods are available for this user (password, OAuth providers)
 */
export const handleGetAuthMethods = async (userUuid: string) => {
  try {
    const user = await User.findByPk(userUuid)
    if (!user) {
      return {
        response: 'User not found',
        error: true,
        status: 404
      }
    }

    // Check if user has password set
    const hasPassword = !!(user.password_hash && user.password_salt)

    // Get all linked OAuth providers
    const oauthAccounts = await OAuthAccount.findAll({
      where: { user_uuid: userUuid },
      attributes: ['oauth_provider']
    })

    const oauthProviders = oauthAccounts.map(account => account.oauth_provider)

    return {
      response: {
        hasPassword,
        oauthProviders
      },
      status: 200
    }
  } catch (error: any) {
    logger.error({ message: 'Error fetching auth methods', error, userUuid })
    return {
      response: 'Failed to fetch authentication methods',
      error: true,
      status: 500
    }
  }
}

/**
 * Get all linked OAuth accounts for a user
 */
export const handleGetOAuthAccounts = async (userUuid: string) => {
  try {
    const oauthAccounts = await OAuthAccount.findAll({
      where: { user_uuid: userUuid },
      attributes: ['uuid', 'oauth_provider', 'oauth_email', 'linked_at', 'created_at'],
      order: [['linked_at', 'DESC']]
    })

    return {
      response: {
        accounts: oauthAccounts
      },
      status: 200
    }
  } catch (error: any) {
    logger.error({ message: 'Error fetching OAuth accounts', error, userUuid })
    return {
      response: 'Failed to fetch OAuth accounts',
      error: true,
      status: 500
    }
  }
}

/**
 * Unlink an OAuth provider from a user's account
 * Includes lockout prevention - won't allow unlinking if it's the only auth method
 */
export const handleUnlinkOAuthProvider = async (userUuid: string, provider: string) => {
  try {
    const user = await User.findByPk(userUuid)
    if (!user) {
      return {
        response: 'User not found',
        error: true,
        status: 404
      }
    }

    // Lockout prevention: Check if user has other auth methods
    const hasPassword = !!(user.password_hash && user.password_salt)
    const oauthAccountCount = await OAuthAccount.count({
      where: { user_uuid: userUuid }
    })

    // If this is the only auth method, prevent unlinking
    if (oauthAccountCount <= 1 && !hasPassword) {
      return {
        response: 'Cannot unlink your only authentication method. Please set a password or link another OAuth provider first.',
        error: true,
        status: 400
      }
    }

    // Find and delete the OAuth account
    const deleted = await OAuthAccount.destroy({
      where: {
        user_uuid: userUuid,
        oauth_provider: provider
      }
    })

    if (deleted === 0) {
      return {
        response: `${provider} account not found or already unlinked`,
        error: true,
        status: 404
      }
    }

    logger.info({ message: 'OAuth provider unlinked', userUuid, provider })

    return {
      response: {
        message: `${provider} account unlinked successfully`
      },
      status: 200
    }
  } catch (error: any) {
    logger.error({ message: 'Error unlinking OAuth provider', error, userUuid, provider })
    return {
      response: 'Failed to unlink OAuth provider',
      error: true,
      status: 500
    }
  }
}
