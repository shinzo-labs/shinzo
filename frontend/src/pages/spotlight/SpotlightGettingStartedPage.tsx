import React, { useState, useEffect } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'
import { Card, Flex, Text, Heading, Button, Code, Badge, Callout, Spinner } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { useAuth } from '../../contexts/AuthContext'
import { useHasSpotlightData } from '../../hooks/useHasSpotlightData'
import { spotlightService } from '../../backendService'
import { CLIPBOARD_TIMEOUT } from '../../config'

// App integration types
type AppCategory = 'cli-agents' | 'code-ides' | 'ai-sdks' | 'ai-gateways' | 'direct-api' | 'custom'

interface AppIntegration {
  id: string
  name: string
  category: AppCategory
  icon: React.ReactNode
  requiresApiKey: boolean
  comingSoon?: boolean
  description?: string
}

const APP_INTEGRATIONS: AppIntegration[] = [
  // CLI Agents
  { id: 'claude-code', name: 'Claude Code', category: 'cli-agents', icon: <Icons.CodeIcon />, requiresApiKey: false },
  { id: 'codex', name: 'Codex', category: 'cli-agents', icon: <Icons.CodeIcon />, requiresApiKey: true, comingSoon: true },
  { id: 'gemini-cli', name: 'Gemini CLI', category: 'cli-agents', icon: <Icons.StarIcon />, requiresApiKey: true, comingSoon: true },

  // Code IDEs
  { id: 'cursor', name: 'Cursor', category: 'code-ides', icon: <Icons.CursorArrowIcon />, requiresApiKey: true, comingSoon: true },
  { id: 'windsurf', name: 'Windsurf', category: 'code-ides', icon: <Icons.Component1Icon />, requiresApiKey: true, comingSoon: true },
  { id: 'vscode', name: 'VS Code', category: 'code-ides', icon: <Icons.CodeIcon />, requiresApiKey: true, comingSoon: true },

  // AI SDKs
  { id: 'anthropic-sdk', name: 'Anthropic SDK', category: 'ai-sdks', icon: <Icons.CodeIcon />, requiresApiKey: true },
  { id: 'openai-sdk', name: 'OpenAI SDK', category: 'ai-sdks', icon: <Icons.CodeIcon />, requiresApiKey: true, comingSoon: true },
  { id: 'langchain', name: 'LangChain', category: 'ai-sdks', icon: <Icons.Link2Icon />, requiresApiKey: true, comingSoon: true },

  // AI Gateways
  { id: 'litellm', name: 'LiteLLM', category: 'ai-gateways', icon: <Icons.LayersIcon />, requiresApiKey: true, comingSoon: true },
  { id: 'openrouter', name: 'OpenRouter', category: 'ai-gateways', icon: <Icons.MixIcon />, requiresApiKey: true, comingSoon: true },
  { id: 'portkey', name: 'Portkey', category: 'ai-gateways', icon: <Icons.LockClosedIcon />, requiresApiKey: true, comingSoon: true },

  // Direct API
  { id: 'anthropic-api', name: 'Anthropic', category: 'direct-api', icon: <Icons.GlobeIcon />, requiresApiKey: true },
  { id: 'openai-api', name: 'OpenAI', category: 'direct-api', icon: <Icons.GlobeIcon />, requiresApiKey: true, comingSoon: true },
  { id: 'gemini-api', name: 'Gemini', category: 'direct-api', icon: <Icons.GlobeIcon />, requiresApiKey: true, comingSoon: true },

  // Custom
  { id: 'custom', name: 'Custom Integration', category: 'custom', icon: <Icons.MixerHorizontalIcon />, requiresApiKey: true }
]

const CATEGORY_LABELS: Record<AppCategory, string> = {
  'cli-agents': 'CLI Agents',
  'code-ides': 'Code IDEs',
  'ai-sdks': 'AI SDKs',
  'ai-gateways': 'AI Gateways',
  'direct-api': 'Direct API',
  'custom': 'Custom'
}

export const SpotlightGettingStartedPage: React.FC = () => {
  const { token } = useAuth()
  const [selectedApp, setSelectedApp] = useState<string | null>(null)
  const [shinzoApiKey, setShinzoApiKey] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({})
  const { hasSpotlightData } = useHasSpotlightData()

  useEffect(() => {
    const fetchOrCreateShinzoKey = async () => {
      try {
        const response = await spotlightService.fetchShinzoApiKeys(token!)
        const keys = response.shinzo_api_keys || []

        if (keys.length > 0) {
          const activeKey = keys.find((k) => k.status === 'active')
          if (activeKey) {
            setShinzoApiKey(activeKey.api_key)
          }
        } else {
          const createResponse = await spotlightService.createShinzoApiKey(token!, {
            key_name: 'Default Onboarding Key',
            key_type: 'live'
          })
          setShinzoApiKey(createResponse.api_key)
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
    }, CLIPBOARD_TIMEOUT)
  }

  const selectedAppConfig = APP_INTEGRATIONS.find(app => app.id === selectedApp)

  // Group apps by category
  const appsByCategory = APP_INTEGRATIONS.reduce((acc, app) => {
    if (!acc[app.category]) acc[app.category] = []
    acc[app.category].push(app)
    return acc
  }, {} as Record<AppCategory, AppIntegration[]>)

  const renderAppSelection = () => (
    <Card>
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="2">
          <Heading size="5">Choose Your Integration</Heading>
          <Text color="gray">
            Select the application or service you want to track with Shinzo AI Analytics.
          </Text>
        </Flex>

        {(Object.keys(appsByCategory) as AppCategory[]).map(category => (
          <Flex key={category} direction="column" gap="3">
            <Text size="3" weight="medium" color="gray">
              {CATEGORY_LABELS[category]}
            </Text>
            <Flex direction="column" gap="2">
              {appsByCategory[category].map(app => (
                <Card
                  key={app.id}
                  onClick={() => !app.comingSoon && setSelectedApp(app.id)}
                  style={{
                    cursor: app.comingSoon ? 'not-allowed' : 'pointer',
                    backgroundColor: selectedApp === app.id ? 'var(--blue-2)' : undefined,
                    borderColor: selectedApp === app.id ? 'var(--blue-6)' : undefined,
                    opacity: app.comingSoon ? 0.6 : 1
                  }}
                >
                  <Flex align="center" justify="between" style={{ padding: '12px' }}>
                    <Flex align="center" gap="3">
                      <Flex
                        align="center"
                        justify="center"
                        style={{
                          width: '40px',
                          height: '40px',
                          backgroundColor: 'var(--gray-3)',
                          borderRadius: '8px'
                        }}
                      >
                        {app.icon}
                      </Flex>
                      <Flex direction="column" gap="1">
                        <Text weight="medium">{app.name}</Text>
                        {app.description && (
                          <Text size="2" color="gray">{app.description}</Text>
                        )}
                      </Flex>
                    </Flex>
                    {app.comingSoon && (
                      <Badge color="gray">Coming Soon</Badge>
                    )}
                  </Flex>
                </Card>
              ))}
            </Flex>
          </Flex>
        ))}
      </Flex>
    </Card>
  )

  const renderSetupInstructions = () => {
    if (!selectedAppConfig) return null

    // Claude Code special case - no API key setup needed
    if (selectedAppConfig.id === 'claude-code') {
      return (
        <Card>
          <Flex direction="column" gap="6">
            <Flex direction="column" gap="2">
              <Heading size="5">Setup Claude Code</Heading>
              <Text color="gray">
                Configure Claude Code to send analytics to Shinzo using custom headers.
              </Text>
            </Flex>

            <Flex direction="column" gap="4">
              <Flex direction="column" gap="2">
                <Text weight="medium">1. Set your Shinzo API key</Text>
                <Text size="2" color="gray">
                  Add this to your shell configuration (~/.zshrc or ~/.bashrc):
                </Text>
                <Flex gap="2" align="center">
                  <Code style={{ flex: 1, padding: '12px' }}>
                    export ANTHROPIC_CUSTOM_HEADERS="x-shinzo-api-key: {shinzoApiKey}"
                  </Code>
                  <Button
                    variant="soft"
                    onClick={() => copyToClipboard(`export ANTHROPIC_CUSTOM_HEADERS="x-shinzo-api-key: ${shinzoApiKey}"`, 'claude-code-header')}
                  >
                    {copiedStates['claude-code-header'] ? <Icons.CheckIcon /> : <Icons.CopyIcon />}
                  </Button>
                </Flex>
              </Flex>

              <Flex direction="column" gap="2">
                <Text weight="medium">2. Set the Shinzo base URL</Text>
                <Flex gap="2" align="center">
                  <Code style={{ flex: 1, padding: '12px' }}>
                    export ANTHROPIC_BASE_URL="https://api.app.shinzo.ai/spotlight/anthropic"
                  </Code>
                  <Button
                    variant="soft"
                    onClick={() => copyToClipboard('export ANTHROPIC_BASE_URL="https://api.app.shinzo.ai/spotlight/anthropic"', 'claude-code-url')}
                  >
                    {copiedStates['claude-code-url'] ? <Icons.CheckIcon /> : <Icons.CopyIcon />}
                  </Button>
                </Flex>
              </Flex>

              <Flex direction="column" gap="2">
                <Text weight="medium">3. Reload your shell and test</Text>
                <Code style={{ padding: '12px' }}>
                  source ~/.zshrc  # or source ~/.bashrc
                </Code>
                <Text size="2" color="gray">
                  Now use Claude Code normally and your analytics will appear below!
                </Text>
              </Flex>

              <Callout.Root color="blue">
                <Callout.Icon>
                  <Icons.InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  Note: OAuth authentication flows will bypass Shinzo routing. Use API key authentication for full analytics coverage.
                </Callout.Text>
              </Callout.Root>
            </Flex>
          </Flex>
        </Card>
      )
    }

    // Generic integration with API key requirement
    if (selectedAppConfig.requiresApiKey) {
      return (
        <Card>
          <Flex direction="column" gap="6">
            <Flex direction="column" gap="2">
              <Heading size="5">Setup {selectedAppConfig.name}</Heading>
              <Text color="gray">
                Configure your integration to route requests through Shinzo.
              </Text>
            </Flex>

            <Flex direction="column" gap="4">
              <Flex direction="column" gap="2">
                <Text weight="medium">1. Add your provider API key</Text>
                <Text size="2" color="gray">
                  First, add your {selectedAppConfig.name} API key in{' '}
                  <Text style={{ color: 'var(--accent-9)', cursor: 'pointer' }}>
                    Settings → API Keys
                  </Text>
                </Text>
              </Flex>

              <Flex direction="column" gap="2">
                <Text weight="medium">2. Use Shinzo's proxy endpoint</Text>
                <Text size="2" color="gray">
                  Update your application to use Shinzo's API endpoint:
                </Text>
                <Flex gap="2" align="center">
                  <Code style={{ flex: 1, padding: '12px' }}>
                    https://api.app.shinzo.ai/spotlight/anthropic
                  </Code>
                  <Button
                    variant="soft"
                    onClick={() => copyToClipboard('https://api.app.shinzo.ai/spotlight/anthropic', 'proxy-url')}
                  >
                    {copiedStates['proxy-url'] ? <Icons.CheckIcon /> : <Icons.CopyIcon />}
                  </Button>
                </Flex>
              </Flex>

              <Flex direction="column" gap="2">
                <Text weight="medium">3. Include your Shinzo API key</Text>
                <Text size="2" color="gray">
                  Add this header to your requests:
                </Text>
                <Flex gap="2" align="center">
                  <Code style={{ flex: 1, padding: '12px' }}>
                    x-shinzo-api-key: {shinzoApiKey}
                  </Code>
                  <Button
                    variant="soft"
                    onClick={() => copyToClipboard(`x-shinzo-api-key: ${shinzoApiKey}`, 'shinzo-key')}
                  >
                    {copiedStates['shinzo-key'] ? <Icons.CheckIcon /> : <Icons.CopyIcon />}
                  </Button>
                </Flex>
              </Flex>

              <Flex direction="column" gap="2">
                <Text weight="medium">4. Example code</Text>
                <Code style={{ padding: '12px', whiteSpace: 'pre-wrap' }}>
{`import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: "https://api.app.shinzo.ai/spotlight/anthropic",
  defaultHeaders: {
    "x-shinzo-api-key": "${shinzoApiKey}"
  }
});`}
                </Code>
              </Flex>
            </Flex>
          </Flex>
        </Card>
      )
    }

    return null
  }

  const renderSuccessState = () => (
    <Card>
      <Flex direction="column" gap="4" align="center" style={{ padding: '32px' }}>
        <Flex
          align="center"
          justify="center"
          style={{
            width: '64px',
            height: '64px',
            backgroundColor: 'var(--green-3)',
            borderRadius: '50%'
          }}
        >
          <Icons.CheckIcon width="32" height="32" color="var(--green-9)" />
        </Flex>
        <Flex direction="column" gap="2" align="center">
          <Heading size="5">Analytics Active!</Heading>
          <Text color="gray" align="center">
            Shinzo is now tracking your AI agent analytics. Start using your application to see data appear.
          </Text>
        </Flex>
        <Button size="3" onClick={() => window.location.href = '/spotlight'}>
          View Analytics Dashboard
          <Icons.ArrowRightIcon />
        </Button>
      </Flex>
    </Card>
  )

  if (loading) {
    return (
      <AppLayout>
        <Flex align="center" justify="center" style={{ height: '50vh' }}>
          <Spinner size="3" />
        </Flex>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <Flex direction="column" gap="6" style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
        <Flex direction="column" gap="2">
          <Heading size="7">AI Analytics Setup</Heading>
          <Text color="gray" size="4">
            Connect your AI application to start tracking usage, costs, and performance.
          </Text>
        </Flex>

        {hasSpotlightData ? (
          renderSuccessState()
        ) : (
          <Flex direction="column" gap="6">
            {renderAppSelection()}
            {selectedApp && renderSetupInstructions()}

            {selectedApp && (
              <Callout.Root>
                <Callout.Icon>
                  <Icons.InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  Once you've completed the setup, make a request with your application and your analytics will appear automatically.
                </Callout.Text>
              </Callout.Root>
            )}
          </Flex>
        )}
      </Flex>
    </AppLayout>
  )
}
