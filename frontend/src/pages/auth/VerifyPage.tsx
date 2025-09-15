import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button, TextField, Text, Heading, Card, Flex, Callout } from '@radix-ui/themes'
import { CheckIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'

export const VerifyPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [verificationToken, setVerificationToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const { verify } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Check if email was passed from registration
    if (location.state?.email) {
      setEmail(location.state.email)
    }

    // Check for verification token in URL params
    const urlParams = new URLSearchParams(location.search)
    const tokenFromUrl = urlParams.get('token')
    const emailFromUrl = urlParams.get('email')

    if (tokenFromUrl) {
      setVerificationToken(tokenFromUrl)
    }
    if (emailFromUrl) {
      setEmail(emailFromUrl)
    }

    // Auto-verify if both email and token are present
    if (emailFromUrl && tokenFromUrl) {
      handleVerification(emailFromUrl, tokenFromUrl)
    }
  }, [location])

  const handleVerification = async (verifyEmail?: string, verifyToken?: string) => {
    const emailToUse = verifyEmail || email
    const tokenToUse = verifyToken || verificationToken

    if (!emailToUse || !tokenToUse) {
      setError('Both email and verification token are required')
      return
    }

    setError('')
    setLoading(true)

    try {
      await verify(emailToUse, tokenToUse)
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleVerification()
  }

  if (success) {
    return (
      <div className="auth-page">
        <Card size="4" style={{ maxWidth: '400px', width: '100%' }}>
          <Flex direction="column" gap="6" align="center">
            <Flex
              justify="center"
              align="center"
              style={{
                width: '64px',
                height: '64px',
                backgroundColor: 'var(--green-3)',
                borderRadius: '50%',
                color: 'var(--green-9)'
              }}
            >
              <CheckIcon width="32" height="32" />
            </Flex>

            <Flex direction="column" gap="2" align="center">
              <Heading size="6">Email Verified!</Heading>
              <Text size="2" color="gray" align="center">
                Your email has been successfully verified. You can now sign in to your account.
              </Text>
              <Text size="1" color="gray" align="center">
                Redirecting to login page in 3 seconds...
              </Text>
            </Flex>
          </Flex>
        </Card>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <Card size="4" style={{ maxWidth: '400px', width: '100%' }}>
        <Flex direction="column" gap="6">
          <Flex direction="column" gap="2" align="center">
            <Heading size="6">Verify Your Email</Heading>
            <Text size="2" color="gray" align="center">
              Enter your email and verification token to complete account setup
            </Text>
          </Flex>

          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="4">
              <Flex direction="column" gap="2">
                <Text size="2" weight="medium">Email</Text>
                <TextField.Root
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </Flex>

              <Flex direction="column" gap="2">
                <Text size="2" weight="medium">Verification Token</Text>
                <TextField.Root
                  type="text"
                  value={verificationToken}
                  onChange={(e) => setVerificationToken(e.target.value)}
                  placeholder="Enter verification token"
                  required
                />
              </Flex>

              {error && (
                <Callout.Root color="red">
                  <Callout.Icon>
                    <ExclamationTriangleIcon />
                  </Callout.Icon>
                  <Callout.Text>{error}</Callout.Text>
                </Callout.Root>
              )}

              <Button
                type="submit"
                size="3"
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </Button>
            </Flex>
          </form>

          <Flex direction="column" gap="4" align="center">
            <Text size="2" color="gray" align="center">
              Didn't receive the verification email?{' '}
              <Text style={{ color: 'var(--accent-9)', cursor: 'pointer' }}>
                Resend verification email
              </Text>
            </Text>

            <Text size="2" color="gray" align="center">
              Need help?{' '}
              <Link to="/support" style={{ color: 'var(--accent-9)', textDecoration: 'none' }}>
                Contact support
              </Link>
            </Text>

            <Text size="2" color="gray" align="center">
              Want to use a different email?{' '}
              <Link to="/register" style={{ color: 'var(--accent-9)', textDecoration: 'none' }}>
                Create new account
              </Link>
            </Text>
          </Flex>
        </Flex>
      </Card>
    </div>
  )
}