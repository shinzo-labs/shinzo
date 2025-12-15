import React, { useState, useEffect } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'
import { Flex, Text, Tabs, Button, Callout, Spinner, Badge } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { useAuth } from '../../contexts/AuthContext'
import { useHasSpotlightData } from '../../hooks/useHasSpotlightData'
import { spotlightService } from '../../backendService'
import { OnboardingHeader, OnboardingStep, CodeSnippet } from '../../components/onboarding'

type IntegrationType = 'claude-code' | 'anthropic-sdk' | 'codex'

type SdkType = 'typescript' | 'python'

export const SpotlightGettingStartedPage: React.FC = () => {
  const { token } = useAuth()
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationType>('claude-code')
  const [shinzoApiKey, setShinzoApiKey] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const { hasSpotlightData } = useHasSpotlightData()
  const [sdkType, setSdkType] = useState<SdkType>('typescript')

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

  const claudeCodeSetupCode = `echo 'export ANTHROPIC_BASE_URL=https://api.app.shinzo.ai/spotlight/anthropic
export ANTHROPIC_CUSTOM_HEADERS="x-shinzo-api-key: ${shinzoApiKey}"' >> ~/.zshrc;
source ~/.zshrc`

  const anthropicSdkSetupCodeTypescript = `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: "https://api.app.shinzo.ai/spotlight/anthropic",
  defaultHeaders: {
    "x-shinzo-api-key": "${shinzoApiKey}"
  }
});`

  const anthropicSdkSetupCodePython = `from anthropic import Anthropic

client = Anthropic(
    api_key="your-anthropic-api-key",
    base_url="https://api.app.shinzo.ai/spotlight/anthropic",
    default_headers={
        "x-shinzo-api-key": "${shinzoApiKey}"
    }
)`

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
      <Flex direction="column" gap="6">
        <OnboardingHeader
          title="AI Analytics Setup"
          description="Connect your AI application to start tracking usage, costs, and performance"
          successMessage="Your Shinzo API key has been automatically generated! Choose an integration below and start sending analytics data."
          showSuccess={!!shinzoApiKey}
        />

        {/* Step 1: Choose Your Integration */}
        <OnboardingStep
          stepNumber={1}
          title="Choose Your Integration"
          description="Select how you want to track your AI usage with Shinzo"
        >
          <Tabs.Root value={selectedIntegration} onValueChange={(value) => setSelectedIntegration(value as IntegrationType)}>
            <Tabs.List>
              <Tabs.Trigger value="claude-code" style={{ cursor: 'pointer' }}>Claude Code</Tabs.Trigger>
              <Tabs.Trigger value="anthropic-sdk" style={{ cursor: 'pointer' }}>Anthropic SDK</Tabs.Trigger>
              <Tabs.Trigger value="codex" disabled style={{ cursor: 'not-allowed' }}>
                Codex
                <Badge size="1" color="gray" style={{ marginLeft: '8px' }}>Coming Soon</Badge>
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>

          {selectedIntegration === 'claude-code' && (
            <Text size="2">
              The Claude Code CLI automatically routes requests through Shinzo when configured with custom headers.
              Perfect for tracking your AI coding assistant usage.
            </Text>
          )}

          {selectedIntegration === 'anthropic-sdk' && (
            <Text size="2">
              The Anthropic SDK integration allows you to track all Claude API calls from your application code.
              Great for production applications and custom AI workflows.
            </Text>
          )}
        </OnboardingStep>

        {/* Step 2: Configure Your Integration */}
        {selectedIntegration === 'claude-code' && (
          <OnboardingStep
            stepNumber={2}
            title="Configure Environment Variables"
            description="Add these to your shell configuration (~/.zshrc or ~/.bashrc)"
          >
            <CodeSnippet
              code={claudeCodeSetupCode}
              copyId="claude-code-setup"
            />

            <Callout.Root color="blue">
              <Callout.Icon>
                <Icons.InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>
                After adding these variables, reload your shell with: <Text weight="bold" style={{ fontFamily: 'monospace' }}>source ~/.zshrc</Text>
              </Callout.Text>
            </Callout.Root>
          </OnboardingStep>
        )}

        {selectedIntegration === 'anthropic-sdk' && (
          <>
            <OnboardingStep
              stepNumber={2}
              title="Choose Your SDK Language"
              description="Select the programming language for your application"
            >
              <Tabs.Root value={sdkType} onValueChange={(value) => setSdkType(value as SdkType)}>
                <Tabs.List>
                  <Tabs.Trigger value="typescript" style={{ cursor: 'pointer' }}>TypeScript / JavaScript</Tabs.Trigger>
                  <Tabs.Trigger value="python" style={{ cursor: 'pointer' }}>Python</Tabs.Trigger>
                </Tabs.List>
              </Tabs.Root>

              {sdkType === 'typescript' && (
                <Text size="2">
                  The TypeScript SDK provides seamless integration with Node.js and JavaScript applications.
                  Perfect for web apps, APIs, and server-side applications.
                </Text>
              )}

              {sdkType === 'python' && (
                <Text size="2">
                  The Python SDK provides native integration with Python applications.
                  Great for data science, automation, and backend services.
                </Text>
              )}
            </OnboardingStep>

            <OnboardingStep
              stepNumber={3}
              title="Install the Anthropic SDK"
              description={sdkType === 'typescript'
                ? 'Add the Anthropic SDK to your project using your preferred package manager'
                : 'Install the Anthropic SDK using pip'}
            >
              {sdkType === 'typescript' ? (
                <Tabs.Root defaultValue="npm">
                  <Tabs.List>
                    <Tabs.Trigger value="npm" style={{ cursor: 'pointer' }}>npm</Tabs.Trigger>
                    <Tabs.Trigger value="pnpm" style={{ cursor: 'pointer' }}>pnpm</Tabs.Trigger>
                    <Tabs.Trigger value="yarn" style={{ cursor: 'pointer' }}>yarn</Tabs.Trigger>
                  </Tabs.List>

                  <Flex direction="column" gap="3" style={{ marginTop: '16px' }}>
                    <Tabs.Content value="npm">
                      <CodeSnippet
                        code="npm install @anthropic-ai/sdk"
                        copyId="npm-install"
                        inline
                      />
                    </Tabs.Content>

                    <Tabs.Content value="pnpm">
                      <CodeSnippet
                        code="pnpm add @anthropic-ai/sdk"
                        copyId="pnpm-install"
                        inline
                      />
                    </Tabs.Content>

                    <Tabs.Content value="yarn">
                      <CodeSnippet
                        code="yarn add @anthropic-ai/sdk"
                        copyId="yarn-install"
                        inline
                      />
                    </Tabs.Content>
                  </Flex>
                </Tabs.Root>
              ) : (
                <CodeSnippet
                  code="pip install anthropic"
                  copyId="python-install"
                  inline
                />
              )}
            </OnboardingStep>

            <OnboardingStep
              stepNumber={4}
              title="Configure Your Client"
              description="Update your Anthropic client initialization to route through Shinzo"
            >
              <CodeSnippet
                code={sdkType === 'typescript' ? anthropicSdkSetupCodeTypescript : anthropicSdkSetupCodePython}
                copyId="anthropic-sdk-setup"
              />

              <Callout.Root color="blue">
                <Callout.Icon>
                  <Icons.InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  Make sure you have your Anthropic API key {sdkType === 'typescript' ? 'set as an environment variable or pass it directly to the client' : 'available to pass to the client'}.
                </Callout.Text>
              </Callout.Root>
            </OnboardingStep>
          </>
        )}

        {/* Step 3/5: Run and Verify */}
        <OnboardingStep
          stepNumber={selectedIntegration === 'anthropic-sdk' ? 5 : 3}
          title="Run Your Application & Verify"
          description="Start making AI requests and your analytics will appear automatically"
        >
          <Flex direction="column" gap="2" style={{ paddingLeft: '20px' }}>
            <Flex align="center" gap="2">
              <Icons.CheckIcon color="var(--green-9)" />
              <Text size="2">Claude API requests are made</Text>
            </Flex>
            <Flex align="center" gap="2">
              <Icons.CheckIcon color="var(--green-9)" />
              <Text size="2">Analytics data is sent to Shinzo</Text>
            </Flex>
            <Flex align="center" gap="2">
              <Icons.CheckIcon color="var(--green-9)" />
              <Text size="2">Data appears in your dashboard within seconds</Text>
            </Flex>
          </Flex>

          <Callout.Root>
            <Callout.Icon>
              <Icons.InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              Note: OAuth authentication flows will bypass Shinzo routing. Use API key authentication for full analytics coverage.
            </Callout.Text>
          </Callout.Root>
        </OnboardingStep>

        {/* Step 4/6: Success State */}
        <OnboardingStep
          stepNumber={
            hasSpotlightData ? (
              <Icons.CheckIcon width="20" height="20" />
            ) : (
              selectedIntegration === 'anthropic-sdk' ? 6 : 4
            )
          }
          title="See Live Analytics via the Dashboard"
          variant={hasSpotlightData ? 'success' : 'pending'}
        >
          {hasSpotlightData ? (
            <>
              <Callout.Root color="green">
                <Callout.Icon>
                  <Icons.CheckCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  <Text weight="bold">Great! We're receiving analytics from your application!</Text>
                  <Text size="2" style={{ marginTop: '4px', display: 'block' }}>
                    Click the button below to view your data in the Dashboard.
                  </Text>
                </Callout.Text>
              </Callout.Root>
              <Button
                variant="solid"
                size="3"
                color="green"
                onClick={() => window.location.href = '/spotlight'}
                style={{ alignSelf: 'flex-start', cursor: 'pointer' }}
              >
                <Icons.DashboardIcon />
                <span style={{ marginLeft: 8 }}>Open Dashboard</span>
                <Icons.ArrowRightIcon style={{ marginLeft: 8 }} />
              </Button>
            </>
          ) : (
            <>
              <Flex align="center" gap="3">
                <Spinner size="3" />
                <Flex direction="column" gap="1">
                  <Text weight="medium">Waiting for analytics data...</Text>
                  <Text size="2" color="gray">
                    Once your application makes Claude API requests, the Dashboard will be unlocked automatically.
                  </Text>
                </Flex>
              </Flex>
              <Callout.Root>
                <Callout.Icon>
                  <Icons.InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  <Text size="2">
                    Make sure your application is configured correctly and making requests to Claude.
                    The platform is actively checking for incoming analytics events.
                  </Text>
                </Callout.Text>
              </Callout.Root>
            </>
          )}
        </OnboardingStep>
      </Flex>
    </AppLayout>
  )
}
