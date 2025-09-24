import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button, TextField, Checkbox, Text, Heading, Card, Flex, Callout } from '@radix-ui/themes'
import { EyeOpenIcon, EyeNoneIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password, rememberMe)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <Card size="4" style={{ maxWidth: '400px', width: '100%' }}>
        <Flex direction="column" gap="6">
          <Flex justify="between" align="center" style={{ width: '100%' }}>
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
            <Heading size="6">Welcome to Shinzo</Heading>
            <Text size="2" color="gray">
              Sign in to your account to continue
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
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                >
                  <TextField.Slot side="right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="1"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeNoneIcon /> : <EyeOpenIcon />}
                    </Button>
                  </TextField.Slot>
                </TextField.Root>
              </Flex>

              <Flex align="center" gap="2">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <Text size="2" color="gray">
                  Remember me
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
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </Flex>
          </form>

          <Flex direction="column" gap="4" align="center">
            <Text size="2" color="gray">
              Don't have an account?{' '}
              <Link to="/register" style={{ color: 'var(--accent-9)', textDecoration: 'none' }}>
                Create one
              </Link>
            </Text>

            <Flex gap="2" align="center">
              <a href="https://www.shinzo.ai/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gray-9)', textDecoration: 'none', fontSize: '12px' }}>
                Privacy Policy
              </a>
              <Text size="1" color="gray">•</Text>
              <a href="https://www.shinzo.ai/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gray-9)', textDecoration: 'none', fontSize: '12px' }}>
                Terms of Service
              </a>
            </Flex>
          </Flex>
        </Flex>
      </Card>
    </div>
  )
}