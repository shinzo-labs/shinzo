import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Flex, Spinner, Text, Card, Callout } from '@radix-ui/themes'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'

export const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const { handleOAuthCallback } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code')
      const provider = window.location.pathname.includes('google') ? 'google' : 'github'

      if (!code) {
        setError('No authorization code received')
        return
      }

      try {
        await handleOAuthCallback(provider, code)
        navigate('/dashboard')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'OAuth authentication failed')
      }
    }

    processCallback()
  }, [searchParams, handleOAuthCallback, navigate])

  return (
    <div className="auth-page">
      <Card size="4" style={{ maxWidth: '400px', width: '100%' }}>
        <Flex direction="column" gap="4" align="center">
          {error ? (
            <>
              <Callout.Root color="red">
                <Callout.Icon>
                  <ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>{error}</Callout.Text>
              </Callout.Root>
              <Text
                size="2"
                style={{ cursor: 'pointer', color: 'var(--accent-9)' }}
                onClick={() => navigate('/login')}
              >
                Return to login
              </Text>
            </>
          ) : (
            <>
              <Spinner size="3" />
              <Text size="2" color="gray">
                Completing authentication...
              </Text>
            </>
          )}
        </Flex>
      </Card>
    </div>
  )
}
