import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

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
        <div className="auth-card">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Email Verified!
            </h1>
            <p className="text-gray-600 mb-6">
              Your email has been successfully verified. You can now sign in to your account.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to login page in 3 seconds...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Verify Your Email
          </h1>
          <p className="text-gray-600">
            Enter your email and verification token to complete account setup
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />

          <Input
            label="Verification Token"
            type="text"
            value={verificationToken}
            onChange={(e) => setVerificationToken(e.target.value)}
            placeholder="Enter verification token"
            required
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </Button>
        </form>

        <div className="mt-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Didn't receive the verification email?{' '}
              <button className="text-blue-600 hover:text-blue-500 font-medium">
                Resend verification email
              </button>
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Need help?{' '}
              <Link to="/support" className="text-blue-600 hover:text-blue-500 font-medium">
                Contact support
              </Link>
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Want to use a different email?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-500 font-medium">
                Create new account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}