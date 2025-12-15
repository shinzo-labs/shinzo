import React, { useState, useEffect } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'
import { Card, Flex, Text, Heading, Button, Code, Badge, Callout, Spinner } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { useAuth } from '../../contexts/AuthContext'
import { useHasSpotlightData } from '../../hooks/useHasSpotlightData'
import { spotlightService } from '../../backendService'
import { CLIPBOARD_TIMEOUT } from '../../config'

interface AppIntegration {
  id: string
  name: string
  icon: React.ReactNode
  requiresApiKey: boolean
  comingSoon?: boolean
  description?: string
}

interface AppCategory {
  id: string
  name: string
  items: AppIntegration[]
}

const APP_INTEGRATIONS: AppCategory[] = [
  {
    id: 'cli-agents',
    name: 'CLI Agents',
    items: [
      { id: 'claude-code', name: 'Claude Code', icon: <Icons.CodeIcon />, requiresApiKey: false },
      { id: 'codex', name: 'Codex', icon: <Icons.CodeIcon />, requiresApiKey: true, comingSoon: true },
      { id: 'gemini-cli', name: 'Gemini CLI', icon: <Icons.StarIcon />, requiresApiKey: true, comingSoon: true },
    ]
  },
  {
    id: 'code-ides',
    name: 'Code IDEs',
    items: [
      { id: 'cursor', name: 'Cursor', icon: <Icons.CursorArrowIcon />, requiresApiKey: true, comingSoon: true },
      { id: 'windsurf', name: 'Windsurf', icon: <Icons.Component1Icon />, requiresApiKey: true, comingSoon: true },
      { id: 'vscode', name: 'VS Code', icon: <Icons.CodeIcon />, requiresApiKey: true, comingSoon: true },
    ]
  },
  {
    id: 'ai-sdks',
    name: 'AI SDKs',
    items: [
      { id: 'anthropic-sdk', name: 'Anthropic SDK', icon: <Icons.CodeIcon />, requiresApiKey: true },
      { id: 'openai-sdk', name: 'OpenAI SDK', icon: <Icons.CodeIcon />, requiresApiKey: true, comingSoon: true },
      { id: 'langchain', name: 'LangChain', icon: <Icons.Link2Icon />, requiresApiKey: true, comingSoon: true },
    ]
  },
  {
    id: 'ai-gateways',
    name: 'AI Gateways',
    items: [
      { id: 'litellm', name: 'LiteLLM', icon: <Icons.LayersIcon />, requiresApiKey: true, comingSoon: true },
      { id: 'openrouter', name: 'OpenRouter', icon: <Icons.MixIcon />, requiresApiKey: true, comingSoon: true },
      { id: 'portkey', name: 'Portkey', icon: <Icons.LockClosedIcon />, requiresApiKey: true, comingSoon: true },
    ]
  },
  {
    id: 'direct-api',
    name: 'Direct API',
    items: [
      { id: 'anthropic-api', name: 'Anthropic', icon: <Icons.GlobeIcon />, requiresApiKey: true },
      { id: 'openai-api', name: 'OpenAI', icon: <Icons.GlobeIcon />, requiresApiKey: true, comingSoon: true },
      { id: 'gemini-api', name: 'Gemini', icon: <Icons.GlobeIcon />, requiresApiKey: true, comingSoon: true },
    ]
  },
  {
    id: 'custom',
    name: 'Custom Integration',
    items: [
      { id: 'custom', name: 'Custom Integration', icon: <Icons.MixerHorizontalIcon />, requiresApiKey: true },
    ]
  }
]

export const SpotlightGettingStartedPage: React.FC = () => {
  const { token } = useAuth()
  const [selectedApp, setSelectedApp] = useState<AppIntegration | null>(null)
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

  const renderAppSelection = () => (
    <Card>
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="2">
          <Heading size="5">Choose Your Integration</Heading>
          <Text color="gray">
            Select the application or service you want to track with Shinzo AI Analytics.
          </Text>
        </Flex>

        {APP_INTEGRATIONS.map(app => (
          <Flex key={app.id} direction="column" gap="3">
            <Text size="3" weight="medium" color="gray">
              {app.name}
            </Text>
            <Flex direction="column" gap="2">
              {app.items.map((item: AppIntegration) => (
                <Card
                  key={item.id}
                  onClick={() => !item.comingSoon && setSelectedApp(item)}
                  style={{
                    cursor: item.comingSoon ? 'not-allowed' : 'pointer',
                    backgroundColor: selectedApp?.id === item.id ? 'var(--blue-2)' : undefined,
                    borderColor: selectedApp?.id === item.id ? 'var(--blue-6)' : undefined,
                    opacity: item.comingSoon ? 0.6 : 1
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
                        {item.icon}
                      </Flex>
                      <Flex direction="column" gap="1">
                        <Text weight="medium">{item.name}</Text>
                        {item.description && (
                          <Text size="2" color="gray">{item.description}</Text>
                        )}
                      </Flex>
                    </Flex>
                    {item.comingSoon && (
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
    if (!selectedApp) return null

    // Claude Code special case - no API key setup needed
    if (selectedApp.id === 'claude-code') {
      return (
        <Card>
          <Flex direction="column" gap="6">
            <Flex direction="column" gap="2">
              <Heading size="5">Setup {selectedApp.name}</Heading>
              <Text color="gray">
                Configure {selectedApp.name} to send analytics to Shinzo using custom headers.
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
                  Now use {selectedApp.name} normally and your analytics will appear below!
                </Text>
              </Flex>

              <Callout.Root color="blue">
                <Callout.Icon>
                  <Icons.InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  Note: OAuth authentication flows will bypass Shinzo routing. Use API key authentication for full {selectedApp.name} analytics coverage.
                </Callout.Text>
              </Callout.Root>
            </Flex>
          </Flex>
        </Card>
      )
    }

    // Generic integration with API key requirement
    if (selectedApp.requiresApiKey) {
      return (
        <Card>
          <Flex direction="column" gap="6">
            <Flex direction="column" gap="2">
              <Heading size="5">Setup {selectedApp.name}</Heading>
              <Text color="gray">
                Configure your integration to route requests through Shinzo.
              </Text>
            </Flex>

            <Flex direction="column" gap="4">
              <Flex direction="column" gap="2">
                <Text weight="medium">1. Add your provider API key</Text>
                <Text size="2" color="gray">
                  First, add your {selectedApp.name} API key in{' '}
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
