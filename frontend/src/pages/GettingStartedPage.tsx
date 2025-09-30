import React, { useState, useEffect } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { Card, Flex, Text, Heading, Box, Button, Code, Tabs, Badge, Callout } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { useAuth } from '../contexts/AuthContext'
import { ingestTokenService } from '../backendService'

export const GettingStartedPage: React.FC = () => {
  const { token } = useAuth()
  const [ingestToken, setIngestToken] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchIngestToken = async () => {
      try {
        const tokens = await ingestTokenService.fetchAll(token!)
        if (tokens.length > 0) {
          setIngestToken(tokens[0].token)
        }
      } catch (error) {
        console.error('Failed to fetch ingest token:', error)
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchIngestToken()
    }
  }, [token])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const typescriptSnippet = `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { instrumentServer } from "@shinzolabs/instrumentation-mcp"

const server = new McpServer({
  name: "my-mcp-server",
  version: "1.0.0"
})

// Add this to enable telemetry
instrumentServer(server, {
  serverName: "my-mcp-server",
  serverVersion: "1.0.0",
  exporterEndpoint: "https://api.app.shinzo.ai/telemetry/ingest_http",
  exporterAuth: {
    type: "bearer",
    token: "${ingestToken || 'your-token-here'}"
  }
})

// Continue with your server setup
server.tool("example", { /* ... */ }, async (args) => {
  // Your tool implementation
})`

  return (
    <AppLayout>
      <Flex direction="column" gap="6">
        {/* Page header */}
        <Box>
          <Heading size="6">Getting Started</Heading>
          <Text color="gray">
            Set up your MCP server with Shinzo Platform in under 5 minutes
          </Text>
        </Box>

        {/* Success banner if token exists */}
        {ingestToken && (
          <Callout.Root color="green">
            <Callout.Icon>
              <Icons.CheckCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              Your ingest token has been automatically generated! Copy the code below and start sending telemetry data.
            </Callout.Text>
          </Callout.Root>
        )}

        {/* Step 1: Install SDK */}
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
              <Heading size="4">Install the SDK</Heading>
            </Flex>

            <Text color="gray">
              Add the Shinzo instrumentation SDK to your MCP server project:
            </Text>

            <Tabs.Root defaultValue="npm">
              <Tabs.List>
                <Tabs.Trigger value="npm">npm</Tabs.Trigger>
                <Tabs.Trigger value="pnpm">pnpm</Tabs.Trigger>
                <Tabs.Trigger value="yarn">yarn</Tabs.Trigger>
              </Tabs.List>

              <Box style={{ marginTop: '16px' }}>
                <Tabs.Content value="npm">
                  <Flex gap="2" align="center">
                    <Code style={{ flex: 1, padding: '12px' }}>
                      npm install @shinzolabs/instrumentation-mcp
                    </Code>
                    <Button
                      variant="soft"
                      onClick={() => copyToClipboard('npm install @shinzolabs/instrumentation-mcp')}
                    >
                      <Icons.CopyIcon />
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </Flex>
                </Tabs.Content>

                <Tabs.Content value="pnpm">
                  <Flex gap="2" align="center">
                    <Code style={{ flex: 1, padding: '12px' }}>
                      pnpm add @shinzolabs/instrumentation-mcp
                    </Code>
                    <Button
                      variant="soft"
                      onClick={() => copyToClipboard('pnpm add @shinzolabs/instrumentation-mcp')}
                    >
                      <Icons.CopyIcon />
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </Flex>
                </Tabs.Content>

                <Tabs.Content value="yarn">
                  <Flex gap="2" align="center">
                    <Code style={{ flex: 1, padding: '12px' }}>
                      yarn add @shinzolabs/instrumentation-mcp
                    </Code>
                    <Button
                      variant="soft"
                      onClick={() => copyToClipboard('yarn add @shinzolabs/instrumentation-mcp')}
                    >
                      <Icons.CopyIcon />
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </Flex>
                </Tabs.Content>
              </Box>
            </Tabs.Root>
          </Flex>
        </Card>

        {/* Step 2: Add to your code */}
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
              <Heading size="4">Add Telemetry to Your Server</Heading>
            </Flex>

            <Text color="gray">
              Import and initialize Shinzo instrumentation in your MCP server:
            </Text>

            <Box style={{ position: 'relative' }}>
              <Code
                style={{
                  display: 'block',
                  padding: '16px',
                  whiteSpace: 'pre',
                  overflowX: 'auto',
                  backgroundColor: 'var(--gray-2)',
                  borderRadius: 'var(--radius-3)',
                  fontSize: '13px',
                  lineHeight: '1.6'
                }}
              >
                {typescriptSnippet}
              </Code>
              <Button
                variant="soft"
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px'
                }}
                onClick={() => copyToClipboard(typescriptSnippet)}
              >
                <Icons.CopyIcon />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </Box>

            {!ingestToken && (
              <Callout.Root color="amber">
                <Callout.Icon>
                  <Icons.ExclamationTriangleIcon />
                </Callout.Icon>
                <Callout.Text>
                  No ingest token found. Generate one in Settings → Ingest Tokens.
                </Callout.Text>
              </Callout.Root>
            )}
          </Flex>
        </Card>

        {/* Step 3: Run and verify */}
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
              <Heading size="4">Run Your Server & Verify</Heading>
            </Flex>

            <Text color="gray">
              Start your MCP server as usual. Telemetry data will automatically be sent to Shinzo Platform when:
            </Text>

            <Flex direction="column" gap="2" style={{ paddingLeft: '20px' }}>
              <Flex align="center" gap="2">
                <Icons.CheckIcon color="var(--green-9)" />
                <Text size="2">Tools are executed</Text>
              </Flex>
              <Flex align="center" gap="2">
                <Icons.CheckIcon color="var(--green-9)" />
                <Text size="2">Resources are accessed</Text>
              </Flex>
              <Flex align="center" gap="2">
                <Icons.CheckIcon color="var(--green-9)" />
                <Text size="2">Errors occur</Text>
              </Flex>
              <Flex align="center" gap="2">
                <Icons.CheckIcon color="var(--green-9)" />
                <Text size="2">Server starts or stops</Text>
              </Flex>
            </Flex>

            <Callout.Root>
              <Callout.Icon>
                <Icons.InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>
                Once your server starts sending data, you'll see it appear in the Dashboard within a few seconds.
              </Callout.Text>
            </Callout.Root>
          </Flex>
        </Card>

        {/* Next steps */}
        <Card>
          <Flex direction="column" gap="4">
            <Heading size="4">Next Steps</Heading>

            <Flex direction="column" gap="3">
              <Button
                variant="soft"
                size="3"
                onClick={() => window.location.href = '/dashboard'}
                style={{ justifyContent: 'flex-start' }}
              >
                <Icons.DashboardIcon />
                <Flex direction="column" align="start" style={{ flex: 1 }}>
                  <Text weight="medium">View Dashboard</Text>
                  <Text size="1" color="gray">See your telemetry data in real-time</Text>
                </Flex>
                <Icons.ArrowRightIcon />
              </Button>

              <Button
                variant="soft"
                size="3"
                onClick={() => window.open('https://docs.shinzo.ai', '_blank')}
                style={{ justifyContent: 'flex-start' }}
              >
                <Icons.ReaderIcon />
                <Flex direction="column" align="start" style={{ flex: 1 }}>
                  <Text weight="medium">Read Documentation</Text>
                  <Text size="1" color="gray">Learn about advanced configuration options</Text>
                </Flex>
                <Icons.ArrowRightIcon />
              </Button>

              <Button
                variant="soft"
                size="3"
                onClick={() => window.location.href = '/settings'}
                style={{ justifyContent: 'flex-start' }}
              >
                <Icons.GearIcon />
                <Flex direction="column" align="start" style={{ flex: 1 }}>
                  <Text weight="medium">Manage Ingest Tokens</Text>
                  <Text size="1" color="gray">Create additional tokens or revoke existing ones</Text>
                </Flex>
                <Icons.ArrowRightIcon />
              </Button>
            </Flex>
          </Flex>
        </Card>

        {/* Help section */}
        <Card style={{ backgroundColor: 'var(--blue-2)', borderColor: 'var(--blue-6)' }}>
          <Flex direction="column" gap="3">
            <Heading size="4">Need Help?</Heading>
            <Text size="2">
              If you're not seeing data or run into issues, check out our troubleshooting guide or contact support.
            </Text>
            <Flex gap="2">
              <Button variant="solid" onClick={() => window.open('https://docs.shinzo.ai', '_blank')}>
                <Icons.QuestionMarkCircledIcon />
                Documentation
              </Button>
              <Button variant="outline" onClick={() => window.open('https://discord.gg/UYUdSdp5N8', '_blank')}>
                <Icons.DiscordLogoIcon />
                Join Discord
              </Button>
            </Flex>
          </Flex>
        </Card>
      </Flex>
    </AppLayout>
  )
}