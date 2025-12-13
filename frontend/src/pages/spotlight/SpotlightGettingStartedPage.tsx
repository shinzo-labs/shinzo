import React, { useState, useEffect } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'
import { Card, Flex, Text, Heading, Box, Button, Code, Badge, Callout, Spinner } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { useAuth } from '../../contexts/AuthContext'
import { useHasSpotlightData } from '../../hooks/useHasSpotlightData'
import axios from 'axios'

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'

type Provider = 'anthropic' | 'openai' | 'gemini'
type IntegrationType = 'generic' | 'claude-code'

export const SpotlightGettingStartedPage: React.FC = () => {
  const { token } = useAuth()
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [integrationType, setIntegrationType] = useState<IntegrationType>('generic')
  const [shinzoApiKey, setShinzoApiKey] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({})
  const { hasSpotlightData } = useHasSpotlightData()

  useEffect(() => {
    const fetchOrCreateShinzoKey = async () => {
      try {
        // Try to fetch existing Shinzo API keys
        const response = await axios.get(`${BACKEND_URL}/spotlight/shinzo_keys`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        const keys = response.data.shinzo_api_keys || []

        if (keys.length > 0) {
          // Use the first active key
          const activeKey = keys.find((k: any) => k.status === 'active')
          if (activeKey) {
            setShinzoApiKey(activeKey.api_key)
          }
        } else {
          // Create a new key if none exist
          const createResponse = await axios.post(
            `${BACKEND_URL}/spotlight/shinzo_keys`,
            { key_name: 'Default Onboarding Key', key_type: 'live' },
            { headers: { Authorization: `Bearer ${token}` } }
          )
          setShinzoApiKey(createResponse.data.api_key)
        }
      } catch (error) {
        console.error('Failed to fetch or create Shinzo API key:', error)
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchOrCreateShinzoKey()
    }
  }, [token])

  const copyToClipboard = (text: string, buttonId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedStates(prev => ({ ...prev, [buttonId]: true }))
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [buttonId]: false }))
    }, 2000)
  }

  const renderProviderSelection = () => (
    <Card>
      <Flex direction="column" gap="4">
        <Flex align="center" gap="3">
          <Flex
            align="center"
            justify="center"
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: 'var(--blue-3)',
              borderRadius: '50%',
              color: 'var(--blue-9)',
              fontWeight: 'bold'
            }}
          >
            1
          </Flex>
          <Heading size="4">Choose Your AI Provider</Heading>
        </Flex>

        <Text color="gray">
          Select the AI provider you want to track with Shinzo
        </Text>

        <Flex direction="column" gap="3">
          {/* Anthropic - Available */}
          <Card
            onClick={() => setSelectedProvider('anthropic')}
            style={{
              cursor: 'pointer',
              backgroundColor: selectedProvider === 'anthropic' ? 'var(--blue-2)' : undefined,
              borderColor: selectedProvider === 'anthropic' ? 'var(--blue-6)' : undefined
            }}
          >
            <Flex align="center" justify="between" style={{ padding: '12px' }}>
              <Flex align="center" gap="3">
                <Box
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--orange-3)',
                    borderRadius: 'var(--radius-2)'
                  }}
                >
                  <Text size="6" weight="bold" style={{ color: 'var(--orange-9)' }}>A</Text>
                </Box>
                <Flex direction="column" gap="1">
                  <Text weight="medium" size="3">Anthropic</Text>
                  <Text size="2" color="gray">Claude API integration</Text>
                </Flex>
              </Flex>
              <Badge color="green">Available</Badge>
            </Flex>
          </Card>

          {/* OpenAI - Coming Soon */}
          <Card style={{ opacity: 0.6, cursor: 'not-allowed' }}>
            <Flex align="center" justify="between" style={{ padding: '12px' }}>
              <Flex align="center" gap="3">
                <Box
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--gray-3)',
                    borderRadius: 'var(--radius-2)'
                  }}
                >
                  <Icons.LockClosedIcon width="20" height="20" />
                </Box>
                <Flex direction="column" gap="1">
                  <Text weight="medium" size="3">OpenAI</Text>
                  <Text size="2" color="gray">GPT integration</Text>
                </Flex>
              </Flex>
              <Badge color="gray">Coming Soon</Badge>
            </Flex>
          </Card>

          {/* Gemini - Coming Soon */}
          <Card style={{ opacity: 0.6, cursor: 'not-allowed' }}>
            <Flex align="center" justify="between" style={{ padding: '12px' }}>
              <Flex align="center" gap="3">
                <Box
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--gray-3)',
                    borderRadius: 'var(--radius-2)'
                  }}
                >
                  <Icons.LockClosedIcon width="20" height="20" />
                </Box>
                <Flex direction="column" gap="1">
                  <Text weight="medium" size="3">Google Gemini</Text>
                  <Text size="2" color="gray">Gemini API integration</Text>
                </Flex>
              </Flex>
              <Badge color="gray">Coming Soon</Badge>
            </Flex>
          </Card>
        </Flex>
      </Flex>
    </Card>
  )

  const renderAnthropicSetup = () => (
    <>
      {/* Step 2: Add Provider API Key */}
      <Card>
        <Flex direction="column" gap="4">
          <Flex align="center" gap="3">
            <Flex
              align="center"
              justify="center"
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'var(--blue-3)',
                borderRadius: '50%',
                color: 'var(--blue-9)',
                fontWeight: 'bold'
              }}
            >
              2
            </Flex>
            <Heading size="4">Add Your Anthropic API Key</Heading>
          </Flex>

          <Text color="gray">
            To route your Claude API requests through Shinzo, you need to add your Anthropic API key to the platform.
            This key will be used to forward your requests to Anthropic.
          </Text>

          <Callout.Root>
            <Callout.Icon>
              <Icons.InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              Your Anthropic API key is encrypted and stored securely. Only one key can be active per provider.
            </Callout.Text>
          </Callout.Root>

          <Button
            variant="solid"
            onClick={() => window.location.href = '/spotlight/api-keys'}
          >
            <Icons.KeyIcon />
            Go to API Keys Page
          </Button>
        </Flex>
      </Card>

      {/* Step 3: Choose Integration Type */}
      <Card>
        <Flex direction="column" gap="4">
          <Flex align="center" gap="3">
            <Flex
              align="center"
              justify="center"
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'var(--blue-3)',
                borderRadius: '50%',
                color: 'var(--blue-9)',
                fontWeight: 'bold'
              }}
            >
              3
            </Flex>
            <Heading size="4">Choose Your Integration</Heading>
          </Flex>

          <Flex direction="column" gap="3">
            <Card
              onClick={() => setIntegrationType('generic')}
              style={{
                cursor: 'pointer',
                backgroundColor: integrationType === 'generic' ? 'var(--blue-2)' : undefined,
                borderColor: integrationType === 'generic' ? 'var(--blue-6)' : undefined
              }}
            >
              <Flex align="center" gap="3" style={{ padding: '12px' }}>
                <Box
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: `2px solid ${integrationType === 'generic' ? 'var(--blue-9)' : 'var(--gray-7)'}`,
                    backgroundColor: integrationType === 'generic' ? 'var(--blue-9)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {integrationType === 'generic' && <Icons.CheckIcon color="white" width="16" height="16" />}
                </Box>
                <Flex direction="column" gap="1" style={{ flex: 1 }}>
                  <Text weight="medium">Generic AI Application</Text>
                  <Text size="2" color="gray">
                    For custom applications using the Anthropic SDK or API
                  </Text>
                </Flex>
              </Flex>
            </Card>

            <Card
              onClick={() => setIntegrationType('claude-code')}
              style={{
                cursor: 'pointer',
                backgroundColor: integrationType === 'claude-code' ? 'var(--blue-2)' : undefined,
                borderColor: integrationType === 'claude-code' ? 'var(--blue-6)' : undefined
              }}
            >
              <Flex align="center" gap="3" style={{ padding: '12px' }}>
                <Box
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: `2px solid ${integrationType === 'claude-code' ? 'var(--blue-9)' : 'var(--gray-7)'}`,
                    backgroundColor: integrationType === 'claude-code' ? 'var(--blue-9)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {integrationType === 'claude-code' && <Icons.CheckIcon color="white" width="16" height="16" />}
                </Box>
                <Flex direction="column" gap="1" style={{ flex: 1 }}>
                  <Text weight="medium">Claude Code</Text>
                  <Text size="2" color="gray">
                    For tracking Claude Code CLI usage
                  </Text>
                </Flex>
              </Flex>
            </Card>
          </Flex>
        </Flex>
      </Card>

      {/* Step 4: Setup Instructions */}
      <Card>
        <Flex direction="column" gap="4">
          <Flex align="center" gap="3">
            <Flex
              align="center"
              justify="center"
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'var(--blue-3)',
                borderRadius: '50%',
                color: 'var(--blue-9)',
                fontWeight: 'bold'
              }}
            >
              4
            </Flex>
            <Heading size="4">Configure Your Application</Heading>
          </Flex>

          {integrationType === 'generic' ? (
            <>
              <Text color="gray">
                Update your application to use Shinzo as a proxy for Anthropic API requests:
              </Text>

              <Flex direction="column" gap="2">
                <Text size="2" weight="medium">1. Set your API key to your Shinzo API Key:</Text>
                <Flex gap="2" align="center">
                  <Code style={{ flex: 1, padding: '12px' }}>
                    {shinzoApiKey || 'Loading...'}
                  </Code>
                  <Button
                    variant="soft"
                    onClick={() => copyToClipboard(shinzoApiKey, 'shinzo-key')}
                    disabled={!shinzoApiKey}
                  >
                    <Icons.CopyIcon />
                    {copiedStates['shinzo-key'] ? 'Copied!' : 'Copy'}
                  </Button>
                </Flex>
              </Flex>

              <Flex direction="column" gap="2">
                <Text size="2" weight="medium">2. Update your base URL to:</Text>
                <Flex gap="2" align="center">
                  <Code style={{ flex: 1, padding: '12px' }}>
                    https://api.app.shinzo.ai/spotlight/anthropic
                  </Code>
                  <Button
                    variant="soft"
                    onClick={() => copyToClipboard('https://api.app.shinzo.ai/spotlight/anthropic', 'base-url')}
                  >
                    <Icons.CopyIcon />
                    {copiedStates['base-url'] ? 'Copied!' : 'Copy'}
                  </Button>
                </Flex>
              </Flex>

              <Callout.Root color="blue">
                <Callout.Icon>
                  <Icons.CodeIcon />
                </Callout.Icon>
                <Callout.Text>
                  <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '4px' }}>
                    Example with Anthropic SDK:
                  </Text>
                  <Code style={{ display: 'block', marginTop: '8px', padding: '8px' }}>
                    {`const client = new Anthropic({
  apiKey: "${shinzoApiKey || 'your-shinzo-api-key'}",
  baseURL: "https://api.app.shinzo.ai/spotlight/anthropic"
})`}
                  </Code>
                </Callout.Text>
              </Callout.Root>
            </>
          ) : (
            <>
              <Text color="gray">
                Configure Claude Code to route requests through Shinzo:
              </Text>

              <Callout.Root color="amber">
                <Callout.Icon>
                  <Icons.InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  Make sure you're logged into Claude Code before setting these environment variables.
                </Callout.Text>
              </Callout.Root>

              <Flex direction="column" gap="2">
                <Text size="2" weight="medium">1. Set the custom header with your Shinzo API Key:</Text>
                <Flex gap="2" align="center">
                  <Code style={{ flex: 1, padding: '12px' }}>
                    {`ANTHROPIC_CUSTOM_HEADERS=x-shinzo-api-key: ${shinzoApiKey || 'your-shinzo-api-key'}`}
                  </Code>
                  <Button
                    variant="soft"
                    onClick={() => copyToClipboard(`ANTHROPIC_CUSTOM_HEADERS=x-shinzo-api-key: ${shinzoApiKey}`, 'claude-code-header')}
                    disabled={!shinzoApiKey}
                  >
                    <Icons.CopyIcon />
                    {copiedStates['claude-code-header'] ? 'Copied!' : 'Copy'}
                  </Button>
                </Flex>
              </Flex>

              <Flex direction="column" gap="2">
                <Text size="2" weight="medium">2. Set the base URL:</Text>
                <Flex gap="2" align="center">
                  <Code style={{ flex: 1, padding: '12px' }}>
                    ANTHROPIC_BASE_URL=https://api.app.shinzo.ai/spotlight/anthropic
                  </Code>
                  <Button
                    variant="soft"
                    onClick={() => copyToClipboard('ANTHROPIC_BASE_URL=https://api.app.shinzo.ai/spotlight/anthropic', 'claude-code-url')}
                  >
                    <Icons.CopyIcon />
                    {copiedStates['claude-code-url'] ? 'Copied!' : 'Copy'}
                  </Button>
                </Flex>
              </Flex>

              <Callout.Root color="blue">
                <Callout.Icon>
                  <Icons.InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  <Text size="2">
                    <strong>Optional:</strong> Add these as exports in your <Code>.zshrc</Code> or shell config file so new terminals start with the correct configuration.
                  </Text>
                </Callout.Text>
              </Callout.Root>

              <Callout.Root color="amber">
                <Callout.Icon>
                  <Icons.ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>
                  <Text size="2">
                    <strong>Note:</strong> For now, you must unset and reset <Code>ANTHROPIC_BASE_URL</Code> since the platform does not handle OAuth routing properly yet.
                  </Text>
                </Callout.Text>
              </Callout.Root>
            </>
          )}
        </Flex>
      </Card>

      {/* Step 5: Verify */}
      <Card style={{
        backgroundColor: hasSpotlightData ? 'var(--green-2)' : 'var(--gray-2)',
        borderColor: hasSpotlightData ? 'var(--green-6)' : 'var(--gray-6)'
      }}>
        <Flex direction="column" gap="4">
          <Flex align="center" gap="3">
            <Flex
              align="center"
              justify="center"
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: hasSpotlightData ? 'var(--green-3)' : 'var(--blue-3)',
                borderRadius: '50%',
                color: hasSpotlightData ? 'var(--green-9)' : 'var(--blue-9)',
                fontWeight: 'bold'
              }}
            >
              {hasSpotlightData ? <Icons.CheckIcon width="20" height="20" /> : '5'}
            </Flex>
            <Heading size="4">Start Tracking Your AI Agent</Heading>
          </Flex>

          {hasSpotlightData ? (
            <>
              <Callout.Root color="green">
                <Callout.Icon>
                  <Icons.CheckCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  <Text weight="bold">Excellent! We're receiving data from your AI agent!</Text>
                  <Text size="2" style={{ marginTop: '4px', display: 'block' }}>
                    Click the button below to view your analytics.
                  </Text>
                </Callout.Text>
              </Callout.Root>
              <Button
                variant="solid"
                size="3"
                color="green"
                onClick={() => window.location.href = '/spotlight/session-analytics'}
                style={{ alignSelf: 'flex-start' }}
              >
                <Icons.BarChartIcon />
                <span style={{ marginLeft: 8 }}>View Analytics</span>
                <Icons.ArrowRightIcon style={{ marginLeft: 8 }} />
              </Button>
            </>
          ) : (
            <>
              <Flex align="center" gap="3">
                <Spinner size="3" />
                <Flex direction="column" gap="1">
                  <Text weight="medium">Waiting for data...</Text>
                  <Text size="2" color="gray">
                    Make a request using your configured application. Data should appear within a few seconds.
                  </Text>
                </Flex>
              </Flex>
              <Callout.Root>
                <Callout.Icon>
                  <Icons.InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  <Text size="2">
                    The platform is actively checking for incoming Spotlight events every 5 seconds.
                  </Text>
                </Callout.Text>
              </Callout.Root>
            </>
          )}
        </Flex>
      </Card>
    </>
  )

  return (
    <AppLayout>
      <Flex direction="column" gap="6">
        {/* Header */}
        <Box>
          <Heading size="6">Getting Started with AI Agent Analytics</Heading>
          <Text color="gray">
            Track your Claude API usage, token consumption, and agent interactions
          </Text>
        </Box>

        {/* Step 1: Provider Selection */}
        {renderProviderSelection()}

        {/* Show Anthropic setup if selected */}
        {selectedProvider === 'anthropic' && renderAnthropicSetup()}
      </Flex>
    </AppLayout>
  )
}
