import React, { useState, useEffect } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'
import { Flex, Text, Tabs, Button, Callout, Spinner, Badge, TextField } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { useAuth } from '../../contexts/AuthContext'
import { useHasSpotlightData } from '../../hooks/useHasSpotlightData'
import { spotlightService } from '../../backendService'
import { OnboardingHeader, OnboardingStep, CodeSnippet } from '../../components/onboarding'
import { BACKEND_URL } from '../../config'
import axios from 'axios'

type IntegrationType = 'claude-code' | 'anthropic-sdk' | 'codex'

type SdkType = 'typescript' | 'python'

type ConfigMethod = 'env-vars' | 'library-params'

export const SpotlightGettingStartedPage: React.FC = () => {
  const { token } = useAuth()
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationType>('claude-code')
  const [shinzoApiKey, setShinzoApiKey] = useState<string>('')
  const [shinzoApiKeyUuid, setShinzoApiKeyUuid] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const { hasSpotlightData } = useHasSpotlightData()
  const [sdkType, setSdkType] = useState<SdkType>('typescript')
  const [configMethod, setConfigMethod] = useState<ConfigMethod>('library-params')

  // Provider API key state
  const [providerApiKey, setProviderApiKey] = useState<string>('')
  const [providerKeyUuid, setProviderKeyUuid] = useState<string | null>(null)
  const [testingProviderKey, setTestingProviderKey] = useState<boolean>(false)
  const [savingProviderKey, setSavingProviderKey] = useState<boolean>(false)
  const [providerKeyError, setProviderKeyError] = useState<string | null>(null)
  const [providerKeySuccess, setProviderKeySuccess] = useState<boolean>(false)
  const [isEditingProviderKey, setIsEditingProviderKey] = useState<boolean>(false)

  // Regenerate key state
  const [regeneratingKey, setRegeneratingKey] = useState<boolean>(false)

  useEffect(() => {
    const fetchOrCreateShinzoKey = async () => {
      try {
        const response = await spotlightService.fetchShinzoApiKeys(token!)
        const keys = response.shinzo_api_keys || []

        if (keys.length > 0) {
          const activeKey = keys.find((k) => k.status === 'active')
          if (activeKey) {
            setShinzoApiKey(activeKey.api_key)
            setShinzoApiKeyUuid(activeKey.uuid)
          }
        } else {
          const createResponse = await spotlightService.createShinzoApiKey(token!, {
            key_name: 'Default Onboarding Key',
            key_type: 'live'
          })
          setShinzoApiKey(createResponse.api_key)
          setShinzoApiKeyUuid(createResponse.uuid)
        }

        // Check if user already has a provider key
        const providerKeysResponse = await axios.get(`${BACKEND_URL}/spotlight/provider_keys`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const providerKeys = providerKeysResponse.data.provider_keys || []
        const activeAnthropicKey = providerKeys.find((k: any) => k.provider === 'anthropic' && k.status === 'active')
        if (activeAnthropicKey) {
          setProviderKeyUuid(activeAnthropicKey.uuid)
          setProviderKeySuccess(true)
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

  const handleTestProviderKey = async () => {
    setTestingProviderKey(true)
    setProviderKeyError(null)
    try {
      const response = await axios.post(`${BACKEND_URL}/spotlight/provider_keys/test`, {
        provider: 'anthropic',
        provider_api_key: providerApiKey
      })
      if (response.data.success) {
        setProviderKeyError(null)
        // Auto-save after successful test
        await handleSaveProviderKey()
      } else {
        setProviderKeyError(response.data.message || 'Invalid API key')
      }
    } catch (error: any) {
      setProviderKeyError(error.response?.data?.message || 'Failed to test API key')
    } finally {
      setTestingProviderKey(false)
    }
  }

  const handleSaveProviderKey = async () => {
    setSavingProviderKey(true)
    setProviderKeyError(null)
    try {
      // If updating existing key, delete the old one first
      if (providerKeyUuid && isEditingProviderKey) {
        await axios.delete(`${BACKEND_URL}/spotlight/provider_keys/${providerKeyUuid}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }

      const createResponse = await axios.post(`${BACKEND_URL}/spotlight/provider_keys`, {
        provider: 'anthropic',
        provider_api_key: providerApiKey,
        label: 'Onboarding Key'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setProviderKeyUuid(createResponse.data.uuid)
      setProviderKeySuccess(true)
      setIsEditingProviderKey(false)
      setProviderApiKey('')
    } catch (error: any) {
      setProviderKeyError(error.response?.data?.error || 'Failed to save API key')
    } finally {
      setSavingProviderKey(false)
    }
  }

  const handleRegenerateShinzoKey = async () => {
    setRegeneratingKey(true)
    try {
      // Revoke the old key
      if (shinzoApiKeyUuid) {
        await axios.delete(`${BACKEND_URL}/spotlight/shinzo_keys/${shinzoApiKeyUuid}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }

      // Create a new key
      const createResponse = await spotlightService.createShinzoApiKey(token!, {
        key_name: 'Regenerated Onboarding Key',
        key_type: 'live'
      })
      setShinzoApiKey(createResponse.api_key)
      setShinzoApiKeyUuid(createResponse.uuid)
    } catch (error) {
      console.error('Failed to regenerate Shinzo API key:', error)
    } finally {
      setRegeneratingKey(false)
    }
  }

  // Claude Code setup - using custom headers for Shinzo API key
  const claudeCodeSetupMacOS = `echo 'export ANTHROPIC_BASE_URL="${BACKEND_URL}/spotlight/anthropic"' >> ~/.zshrc
echo 'export ANTHROPIC_CUSTOM_HEADERS="x-shinzo-api-key: ${shinzoApiKey}"' >> ~/.zshrc
source ~/.zshrc`

  const claudeCodeSetupLinux = `echo 'export ANTHROPIC_BASE_URL="${BACKEND_URL}/spotlight/anthropic"' >> ~/.bashrc
echo 'export ANTHROPIC_CUSTOM_HEADERS="x-shinzo-api-key: ${shinzoApiKey}"' >> ~/.bashrc
source ~/.bashrc`

  const claudeCodeSetupWindows = `[System.Environment]::SetEnvironmentVariable('ANTHROPIC_BASE_URL', '${BACKEND_URL}/spotlight/anthropic', 'User')
[System.Environment]::SetEnvironmentVariable('ANTHROPIC_CUSTOM_HEADERS', 'x-shinzo-api-key: ${shinzoApiKey}', 'User')`

  // Anthropic SDK - Environment variables setup
  const envVarsSetup = `export ANTHROPIC_API_KEY="${shinzoApiKey}"
export ANTHROPIC_BASE_URL="${BACKEND_URL}/spotlight/anthropic"`

  // Anthropic SDK - Library parameters setup (TypeScript)
  const libraryParamsTypescript = `import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: "${shinzoApiKey}",
  baseURL: "${BACKEND_URL}/spotlight/anthropic"
});

const msg = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1000,
  messages: [
    {
      role: "user",
      content: "Hello, Claude"
    }
  ]
});
console.log(msg);`

  // Anthropic SDK - Library parameters setup (Python)
  const libraryParamsPython = `import anthropic

client = anthropic.Anthropic(
    api_key="${shinzoApiKey}",
    base_url="${BACKEND_URL}/spotlight/anthropic"
)

message = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1000,
    messages=[
        {
            "role": "user",
            "content": "Hello, Claude"
        }
    ]
)
print(message.content)`

  // Anthropic SDK - Env vars code (TypeScript)
  const envVarsCodeTypescript = `import Anthropic from "@anthropic-ai/sdk";

// SDK reads from ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL env vars
const anthropic = new Anthropic();

const msg = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1000,
  messages: [
    {
      role: "user",
      content: "Hello, Claude"
    }
  ]
});
console.log(msg);`

  // Anthropic SDK - Env vars code (Python)
  const envVarsCodePython = `import anthropic

# SDK reads from ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL env vars
client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1000,
    messages=[
        {
            "role": "user",
            "content": "Hello, Claude"
        }
    ]
)
print(message.content)`

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
        />

        {/* Step 1: Enter Your Anthropic API Key */}
        <OnboardingStep
          stepNumber={providerKeySuccess && !isEditingProviderKey ? <Icons.CheckIcon width="20" height="20" /> : 1}
          title="Enter Your Anthropic API Key"
          description="Your API key is required to proxy requests through Shinzo. It will be stored securely."
          variant={providerKeySuccess && !isEditingProviderKey ? 'success' : 'default'}
        >
          {providerKeySuccess && !isEditingProviderKey ? (
            <Flex direction="column" gap="3">
              <Callout.Root color="green">
                <Callout.Icon>
                  <Icons.CheckCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  Your Anthropic API key has been saved securely.
                </Callout.Text>
              </Callout.Root>
              <Button
                variant="soft"
                onClick={() => setIsEditingProviderKey(true)}
                style={{ alignSelf: 'flex-start', cursor: 'pointer' }}
              >
                <Icons.Pencil1Icon />
                Update API Key
              </Button>
            </Flex>
          ) : (
            <>
              <Callout.Root color="blue">
                <Callout.Icon>
                  <Icons.InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  Shinzo requires your own Anthropic API key to proxy requests. Get your API key from the{' '}
                  <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>
                    Anthropic Console
                  </a>.
                </Callout.Text>
              </Callout.Root>
              <Flex direction="column" gap="3">
                <TextField.Root
                  type="password"
                  placeholder="sk-ant-api03-..."
                  value={providerApiKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setProviderApiKey(e.target.value)
                    setProviderKeyError(null)
                  }}
                />
                {providerKeyError && (
                  <Callout.Root color="red" size="1">
                    <Callout.Icon>
                      <Icons.ExclamationTriangleIcon />
                    </Callout.Icon>
                    <Callout.Text>{providerKeyError}</Callout.Text>
                  </Callout.Root>
                )}
                <Flex gap="2">
                  <Button
                    onClick={handleTestProviderKey}
                    disabled={!providerApiKey || testingProviderKey || savingProviderKey}
                    style={{ cursor: 'pointer' }}
                  >
                    {testingProviderKey || savingProviderKey ? (
                      <>
                        <Spinner size="1" />
                        {testingProviderKey ? 'Testing...' : 'Saving...'}
                      </>
                    ) : (
                      <>
                        <Icons.CheckIcon />
                        {isEditingProviderKey ? 'Update API Key' : 'Verify & Save API Key'}
                      </>
                    )}
                  </Button>
                  {isEditingProviderKey && (
                    <Button
                      variant="soft"
                      color="gray"
                      onClick={() => {
                        setIsEditingProviderKey(false)
                        setProviderApiKey('')
                        setProviderKeyError(null)
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      Cancel
                    </Button>
                  )}
                </Flex>
              </Flex>
            </>
          )}
        </OnboardingStep>

        {/* Step 2: Choose Your Integration */}
        <OnboardingStep
          stepNumber={2}
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
              The Claude Code CLI automatically routes requests through Shinzo when configured with environment variables.
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

        {/* Step 3: Configure Your Integration */}
        {selectedIntegration === 'claude-code' && (
          <OnboardingStep
            stepNumber={3}
            title="Configure Environment Variables"
            description="Set environment variables for your operating system"
          >
            <Flex direction="column" gap="3">
              <Flex align="center" gap="2">
                <Text size="2" weight="medium">Shinzo API Key:</Text>
                <Text size="2" style={{ fontFamily: 'monospace' }}>{shinzoApiKey.substring(0, 20)}...</Text>
                <Button
                  size="1"
                  variant="ghost"
                  onClick={handleRegenerateShinzoKey}
                  disabled={regeneratingKey}
                  style={{ cursor: 'pointer' }}
                >
                  {regeneratingKey ? <Spinner size="1" /> : <Icons.ReloadIcon />}
                </Button>
              </Flex>

              <Tabs.Root defaultValue="macos">
                <Tabs.List>
                  <Tabs.Trigger value="macos" style={{ cursor: 'pointer' }}>macOS</Tabs.Trigger>
                  <Tabs.Trigger value="linux" style={{ cursor: 'pointer' }}>Linux</Tabs.Trigger>
                  <Tabs.Trigger value="windows" style={{ cursor: 'pointer' }}>Windows</Tabs.Trigger>
                </Tabs.List>

                <Flex direction="column" gap="3" style={{ marginTop: '16px' }}>
                  <Tabs.Content value="macos">
                    <CodeSnippet
                      code={claudeCodeSetupMacOS}
                      copyId="claude-code-macos"
                    />
                    <Callout.Root color="blue">
                      <Callout.Icon>
                        <Icons.InfoCircledIcon />
                      </Callout.Icon>
                      <Callout.Text>
                        If you are a Bash user: replace <Text style={{ fontFamily: 'monospace' }}>~/.zshrc</Text> with <Text style={{ fontFamily: 'monospace' }}>~/.bashrc</Text>.
                      </Callout.Text>
                    </Callout.Root>
                  </Tabs.Content>

                  <Tabs.Content value="linux">
                    <CodeSnippet
                      code={claudeCodeSetupLinux}
                      copyId="claude-code-linux"
                    />
                  </Tabs.Content>

                  <Tabs.Content value="windows">
                    <CodeSnippet
                      code={claudeCodeSetupWindows}
                      copyId="claude-code-windows"
                    />
                    <Callout.Root color="blue">
                    <Callout.Icon>
                        <Icons.InfoCircledIcon />
                      </Callout.Icon>
                      <Callout.Text>
                        You may need to restart the terminal for the changes to take effect. Run the commands as Administrator for best results.
                      </Callout.Text>
                    </Callout.Root>
                  </Tabs.Content>
                </Flex>
              </Tabs.Root>
            </Flex>
          </OnboardingStep>
        )}

        {selectedIntegration === 'anthropic-sdk' && (
          <>
            <OnboardingStep
              stepNumber={3}
              title="Choose Your SDK Language"
              description="Select the programming language for your application"
            >
              <Tabs.Root value={sdkType} onValueChange={(value) => setSdkType(value as SdkType)}>
                <Tabs.List>
                  <Tabs.Trigger value="typescript" style={{ cursor: 'pointer' }}>TypeScript</Tabs.Trigger>
                  <Tabs.Trigger value="python" style={{ cursor: 'pointer' }}>Python</Tabs.Trigger>
                </Tabs.List>
              </Tabs.Root>

              {sdkType === 'typescript' && (
                <>
                  <Text size="2">
                    The TypeScript SDK provides seamless integration with Node.js and JavaScript applications.
                    Perfect for web apps, APIs, and server-side applications.
                  </Text>
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
                </>

              )}

              {sdkType === 'python' && (
                <>
                  <Text size="2">
                    The Python SDK provides native integration with Python applications.
                    Great for data science, automation, and backend services.
                  </Text>
                  <CodeSnippet
                    code="pip install anthropic"
                    copyId="python-install"
                    inline
                  />
                </>
              )}
            </OnboardingStep>

            <OnboardingStep
              stepNumber={4}
              title="Configure Your Client"
              description="Choose how to configure the Anthropic SDK with Shinzo routing"
            >
              <Flex direction="column" gap="3">
                <Flex align="center" gap="2">
                  <Text size="2" weight="medium">Shinzo API Key:</Text>
                  <Text size="2" style={{ fontFamily: 'monospace' }}>{shinzoApiKey.substring(0, 20)}...</Text>
                  <Button
                    size="1"
                    variant="ghost"
                    onClick={handleRegenerateShinzoKey}
                    disabled={regeneratingKey}
                    style={{ cursor: 'pointer' }}
                  >
                    {regeneratingKey ? <Spinner size="1" /> : <Icons.ReloadIcon />}
                  </Button>
                </Flex>

                <Tabs.Root value={configMethod} onValueChange={(value) => setConfigMethod(value as ConfigMethod)}>
                  <Tabs.List>
                    <Tabs.Trigger value="library-params" style={{ cursor: 'pointer' }}>Class Params (Recommended)</Tabs.Trigger>
                    <Tabs.Trigger value="env-vars" style={{ cursor: 'pointer' }}>Environment Variables</Tabs.Trigger>
                  </Tabs.List>

                  <Flex direction="column" gap="3" style={{ marginTop: '16px' }}>
                    <Tabs.Content value="library-params">
                      <Flex direction="column" gap="3">
                        <Text size="2" color="gray">
                          Pass the configuration directly to the SDK constructor:
                        </Text>
                        <CodeSnippet
                          code={sdkType === 'typescript' ? libraryParamsTypescript : libraryParamsPython}
                          copyId="library-params-code"
                        />
                      </Flex>
                    </Tabs.Content>

                    <Tabs.Content value="env-vars">
                      <Flex direction="column" gap="3">
                        <Text size="2" color="gray">
                          Set these environment variables, then initialize the SDK without parameters:
                        </Text>
                        <CodeSnippet
                          code={envVarsSetup}
                          copyId="env-vars-setup"
                        />
                        <CodeSnippet
                          code={sdkType === 'typescript' ? envVarsCodeTypescript : envVarsCodePython}
                          copyId="env-vars-code"
                        />
                      </Flex>
                    </Tabs.Content>
                  </Flex>
                </Tabs.Root>
              </Flex>
            </OnboardingStep>
          </>
        )}

        {/* Step 4/5: Run and Verify */}
        <OnboardingStep
          stepNumber={selectedIntegration === 'anthropic-sdk' ? 5 : 4}
          title="Run Your Application & Verify"
          description="Start making AI requests and your analytics will appear automatically"
        >
          {selectedIntegration === 'claude-code' && (
            <Flex direction="column" gap="3">
              <Text size="2">Run Claude Code to start sending analytics:</Text>
              <CodeSnippet
                code="claude"
                copyId="run-claude"
                inline
              />
              <Callout.Root color="blue">
                <Callout.Icon>
                  <Icons.InfoCircledIcon />
                </Callout.Icon>
                <Callout.Text>
                  <Text size="2" weight="medium" style={{ display: 'block', marginBottom: '8px' }}>
                    You'll see several login screens. Follow these steps:
                  </Text>
                  <Flex direction="column" gap="2" style={{ paddingLeft: '8px' }}>
                    <Text size="2">
                      1. When prompted to choose a login method, select{' '}
                      <Text weight="medium" style={{ fontFamily: 'monospace' }}>2. Anthropic Console account · API usage billing</Text>
                    </Text>
                    <Text size="2">
                      2. When you see "Detected a custom API key in your environment... Do you want to use this API key?", select{' '}
                      <Text weight="medium" style={{ fontFamily: 'monospace' }}>No (Recommended)</Text>
                    </Text>
                    <Text size="2">
                      3. You may need to restart <Text style={{ fontFamily: 'monospace' }}>claude</Text> after completing login for Shinzo observability to take effect.
                    </Text>
                  </Flex>
                </Callout.Text>
              </Callout.Root>
            </Flex>
          )}
          <Flex direction="column" gap="2" style={{ paddingLeft: '20px', marginTop: selectedIntegration === 'claude-code' ? '16px' : '0' }}>
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
        </OnboardingStep>

        {/* Step 5/6: Success State */}
        <OnboardingStep
          stepNumber={
            hasSpotlightData ? (
              <Icons.CheckIcon width="20" height="20" />
            ) : (
              selectedIntegration === 'anthropic-sdk' ? 6 : 5
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
                onClick={() => window.location.href = '/spotlight/session-analytics'}
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
