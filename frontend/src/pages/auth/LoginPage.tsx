import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button, TextField, Checkbox, Text, Heading, Card, Flex, Callout, Separator } from '@radix-ui/themes'
import { EyeOpenIcon, EyeNoneIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginMode, setLoginMode] = useState<'oauth' | 'email'>('oauth')

  const { login, loginWithGoogle, loginWithGithub } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password, rememberMe)
      navigate(returnTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)

    try {
      await loginWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed')
      setLoading(false)
    }
  }

  const handleGithubLogin = async () => {
    setError('')
    setLoading(true)

    try {
      await loginWithGithub()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub login failed')
      setLoading(false)
    }
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
            <Heading size="6">Welcome to Shinzo</Heading>
            <Text size="2" color="gray">
              Sign in to your account to continue
            </Text>
          </Flex>

          {loginMode === 'oauth' ? (
            <Flex direction="column" gap="4">
              <Button
                type="button"
                size="3"
                variant="outline"
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z" fill="#4285F4"/>
                  <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
                  <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                  <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>

              <Button
                type="button"
                size="3"
                variant="outline"
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={handleGithubLogin}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 98 96" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"/>
                </svg>
                Continue with GitHub
              </Button>

              {error && (
                <Callout.Root color="red">
                  <Callout.Icon>
                    <ExclamationTriangleIcon />
                  </Callout.Icon>
                  <Callout.Text>{error}</Callout.Text>
                </Callout.Root>
              )}

              <Flex direction="column" gap="3" align="center" style={{ marginTop: '8px' }}>
                <Separator size="4" />
                <Text size="2" color="gray">
                  Looking for legacy login?{' '}
                  <span
                    onClick={() => setLoginMode('email')}
                    style={{ color: 'var(--accent-9)', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Login here
                  </span>
                </Text>
              </Flex>
            </Flex>
          ) : (
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
                  <Callout.Text>
                    {error}
                    {error.includes('verify your email') && (
                      <>
                        {' '}
                        <Link
                          to="/verify"
                          state={{ email }}
                          style={{ color: 'var(--red-11)', textDecoration: 'underline' }}
                        >
                          Click here to verify your email
                        </Link>
                      </>
                    )}
                  </Callout.Text>
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

              <Flex direction="column" gap="3" align="center" style={{ marginTop: '8px' }}>
                <Separator size="4" />
                <Text size="2" color="gray">
                  If you don't have a legacy account,{' '}
                  <span
                    onClick={() => setLoginMode('oauth')}
                    style={{ color: 'var(--accent-9)', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    login here
                  </span>
                </Text>
              </Flex>
            </Flex>
          </form>
          )}

          <Flex direction="column" gap="4" align="center">
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