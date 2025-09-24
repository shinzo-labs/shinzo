import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button, TextField, Checkbox, Text, Heading, Card, Flex, Callout, Progress } from '@radix-ui/themes'
import { CheckIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

  const { register, resendVerification } = useAuth()
  const navigate = useNavigate()

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

  if (success) {
    return (
      <div className="auth-page">
        <Card size="4" style={{ maxWidth: '400px', width: '100%' }}>
          <Flex direction="column" gap="6" align="center">
            <Flex justify="space-between" align="center" style={{ width: '100%' }}>
              <a
                href="https://www.shinzo.ai"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <img
                  src="/ShinzoIconV2-128x128.png"
                  alt="Shinzo Labs"
                  style={{
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer'
                  }}
                />
              </a>
              <div />
            </Flex>

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
              <Heading size="6">Account Created!</Heading>
              <Text size="2" color="gray" align="center">
                We've sent a verification email to <Text weight="bold">{email}</Text>.
                Please check your inbox and click the verification link.
              </Text>
            </Flex>


            <Flex direction="column" gap="4" style={{ width: '100%' }}>
              <Button
                size="3"
                style={{ width: '100%' }}
                onClick={() => navigate('/verify', { state: { email } })}
              >
                Verify Email Now
              </Button>

              <Text size="2" color="gray" align="center">
                Didn't receive the email?{' '}
                <Text
                  style={{ color: 'var(--accent-9)', cursor: 'pointer' }}
                  onClick={handleResendVerification}
                >
                  {resendLoading ? 'Sending...' : 'Resend verification email'}
                </Text>
              </Text>

              {error && (
                <Callout.Root color="red">
                  <Callout.Icon>
                    <ExclamationTriangleIcon />
                  </Callout.Icon>
                  <Callout.Text>{error}</Callout.Text>
                </Callout.Root>
              )}
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
          <Flex justify="space-between" align="center" style={{ width: '100%' }}>
            <a
              href="https://www.shinzo.ai"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <img
                src="/ShinzoIconV2-128x128.png"
                alt="Shinzo Labs"
                style={{
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer'
                }}
              />
            </a>
            <div />
          </Flex>

          <Flex direction="column" gap="2" align="center">
            <Heading size="6">Create Account</Heading>
            <Text size="2" color="gray">
              Get started with Shinzo platform
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
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </Flex>
          </form>

          <Text size="2" color="gray" align="center">
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent-9)', textDecoration: 'none' }}>
              Sign in
            </Link>
          </Text>
        </Flex>
      </Card>
    </div>
  )
}