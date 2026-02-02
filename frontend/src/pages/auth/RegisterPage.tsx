import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button, TextField, Checkbox, Text, Heading, Card, Flex, Callout, Progress } from '@radix-ui/themes'
import { CheckIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { FeatureChecklist } from '../../components/auth/FeatureChecklist'

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [verificationToken, setVerificationToken] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)

  const { register, resendVerification, verify } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/dashboard'

  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return strength
  }

  const passwordStrength = getPasswordStrength(password)
  const passwordStrengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
  const passwordStrengthColors = ['red', 'orange', 'yellow', 'blue', 'green']

  // Check if all required fields are filled and valid
  const isFormValid =
    email.trim() !== '' &&
    password.length >= 8 &&
    confirmPassword !== '' &&
    password === confirmPassword &&
    agreeToTerms

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (!agreeToTerms) {
      setError('You must agree to the terms of service')
      return
    }

    setLoading(true)

    try {
      await register(email, password)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setError('')
    setResendLoading(true)

    try {
      await resendVerification(email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification email')
    } finally {
      setResendLoading(false)
    }
  }

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!verificationToken) {
      setError('Please enter your verification token')
      return
    }

    setError('')
    setVerifyLoading(true)

    try {
      await verify(email, verificationToken)
      // Auto-redirect after successful verification
      setTimeout(() => {
        navigate(returnTo)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setVerifyLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <a
          href="https://shinzo.ai"
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            textDecoration: 'none'
          }}
        >
          <img
            src="/images/ShinzoIcon512.png"
            alt="Back to Shinzo"
            style={{
              width: '48px',
              height: '48px',
              cursor: 'pointer'
            }}
          />
        </a>
        <div className="auth-layout">
          <FeatureChecklist />
          <div className="auth-form-container">
            <Card size="4" style={{ maxWidth: '400px', width: '100%' }}>
          <Flex direction="column" gap="6">
            <Flex justify="center" align="center" style={{ width: '100%' }}>
              <a
                href="https://www.shinzo.ai"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <img
                  src="/images/ShinzoIcon512.png"
                  alt="Shinzo Labs"
                  style={{
                    width: '128px',
                    height: '128px',
                    cursor: 'pointer'
                  }}
                />
              </a>
              <div />
            </Flex>

            <Flex direction="column" gap="2" align="center">
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
              <Heading size="6">Account Created!</Heading>
              <Text size="2" color="gray" align="center">
                We've sent a verification email to <Text weight="bold">{email}</Text>.
                Please enter the verification token below to complete your account setup.
              </Text>
            </Flex>

            <form onSubmit={handleVerification}>
              <Flex direction="column" gap="4">
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
                  disabled={verifyLoading}
                >
                  {verifyLoading ? 'Verifying...' : 'Verify Email'}
                </Button>
              </Flex>
            </form>

            <Flex direction="column" gap="3" align="center">
              <Text size="2" color="gray" align="center">
                Didn't receive the email?{' '}
                <Text
                  style={{ color: 'var(--accent-9)', cursor: 'pointer' }}
                  onClick={handleResendVerification}
                >
                  {resendLoading ? 'Sending...' : 'Resend verification email'}
                </Text>
              </Text>

              <Text size="2" color="gray" align="center">
                Need help?{' '}
                <Link to="/support" style={{ color: 'var(--accent-9)', textDecoration: 'none' }}>
                  Contact support
                </Link>
              </Text>
            </Flex>
          </Flex>
        </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <a
        href="https://shinzo.ai"
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          textDecoration: 'none'
        }}
      >
        <img
          src="/images/ShinzoIcon512.png"
          alt="Back to Shinzo"
          style={{
            width: '48px',
            height: '48px',
            cursor: 'pointer'
          }}
        />
      </a>
      <div className="auth-layout">
        <FeatureChecklist />
        <div className="auth-form-container">
          <Card size="4" style={{ maxWidth: '400px', width: '100%' }}>
        <Flex direction="column" gap="2">
          <Flex justify="center" align="center" style={{ width: '100%' }}>
            <a
              href="https://www.shinzo.ai"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <img
                src="/images/ShinzoIcon512.png"
                alt="Shinzo Labs"
                style={{
                  width: '128px',
                  height: '128px',
                  cursor: 'pointer'
                }}
              />
            </a>
            <div />
          </Flex>

          <Flex direction="column" gap="2" align="center">
            <Heading size="6">Create Account</Heading>
            <Text size="2" color="gray">
              Get started with Shinzo
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
                <Text size="2" weight="medium">Password</Text>
                <TextField.Root
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                />
                {password && (
                  <Flex direction="column" gap="1">
                    <Progress
                      value={(passwordStrength / 5) * 100}
                      color={passwordStrengthColors[passwordStrength - 1] as any}
                      size="1"
                    />
                    <Text size="1" color="gray">
                      Password strength: {passwordStrength > 0 ? passwordStrengthLabels[passwordStrength - 1] : 'None'}
                    </Text>
                  </Flex>
                )}
              </Flex>

              <Flex direction="column" gap="2">
                <Text size="2" weight="medium">Confirm Password</Text>
                <TextField.Root
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
                {confirmPassword && password !== confirmPassword && (
                  <Text size="1" color="red">
                    Passwords must match
                  </Text>
                )}
              </Flex>

              <Flex align="start" gap="2">
                <Checkbox
                  id="agree-terms"
                  checked={agreeToTerms}
                  onCheckedChange={(checked) => setAgreeToTerms(checked === true)}
                  style={{ marginTop: '2px' }}
                />
                <Text size="2" color="gray">
                  I agree to the{' '}
                  <a href="https://www.shinzo.ai/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-9)', textDecoration: 'none' }}>
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="https://www.shinzo.ai/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-9)', textDecoration: 'none' }}>
                    Privacy Policy
                  </a>
                </Text>
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
                disabled={loading || !isFormValid}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </Flex>
          </form>

          <Text size="2" color="gray" align="center">
            Already have an account?{' '}
            <Link to={`/login${returnTo !== '/dashboard' ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`} style={{ color: 'var(--accent-9)', textDecoration: 'none' }}>
              Sign in
            </Link>
          </Text>
        </Flex>
      </Card>
        </div>
      </div>
    </div>
  )
}