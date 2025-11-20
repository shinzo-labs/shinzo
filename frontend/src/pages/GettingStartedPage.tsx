import React, { useState, useEffect } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { Card, Flex, Text, Heading, Box, Button, Code, Tabs, Badge, Callout, Spinner } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { useAuth } from '../contexts/AuthContext'
import { ingestTokenService, telemetryService } from '../backendService'
import { subHours } from 'date-fns'
import { BACKEND_URL } from '../config'

type SdkType = 'typescript' | 'python-mcp' | 'python-fastmcp'

export const GettingStartedPage: React.FC = () => {
  const { token } = useAuth()
  const [ingestToken, setIngestToken] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({})
  const [hasTelemetry, setHasTelemetry] = useState(false)
  const [sdkType, setSdkType] = useState<SdkType>('typescript')

  useEffect(() => {
    const fetchIngestToken = async () => {
      try {
        const tokens = await ingestTokenService.fetchAll(token!)
        if (tokens.length > 0) {
          setIngestToken(tokens[0].ingest_token)
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

  // Poll for telemetry data every 5 seconds
  useEffect(() => {
    if (!token) {
      return
    }

    const checkForTelemetry = async () => {
      try {
        const traces = await telemetryService.fetchTraces(token, {
          start_time: subHours(new Date(), 1).toISOString(),
          end_time: new Date().toISOString(),
          limit: 1
        })

        setHasTelemetry(traces.length > 0)
      } catch (error) {
        console.error('Error checking for telemetry:', error)
      }
    }

    // Initial check
    checkForTelemetry()

    // Poll every 5 seconds
    const interval = setInterval(checkForTelemetry, 5000)

    return () => clearInterval(interval)
  }, [token])

  const copyToClipboard = (text: string, buttonId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedStates(prev => ({ ...prev, [buttonId]: true }))
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [buttonId]: false }))
    }, 2000)
  }

  const typescriptSnippet = `import { instrumentServer } from "@shinzolabs/instrumentation-mcp"
// import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

// Instantiate your MCP server as usual here...
// const server = new McpServer({
//  name: "my-mcp-server",
//  version: "1.0.0"
// })

instrumentServer(server, {
  serverName: "my-mcp-server",
  serverVersion: "1.0.0",
  exporterEndpoint: "${BACKEND_URL}/telemetry/ingest_http",
  exporterAuth: {
    type: "bearer",
    token: "${ingestToken || 'your-token-here'}" // you can create additional tokens in the Settings page after this is complete
  }
})

// Continue with server tool setup...
// server.tool(...)
//
// NOTE: The telemetry only works with server.tool(...) registration at the moment. Other registration methods are coming soon!`

  const pythonFastMcpSnippet = `from mcp.server.fastmcp import FastMCP
from shinzo import instrument_server

# Create FastMCP server
mcp = FastMCP(name="my-mcp-server")

# Instrument it with Shinzo
observability = instrument_server(
    mcp,
    config={
        "server_name": "my-mcp-server",
        "server_version": "1.0.0",
        "exporter_endpoint": "${BACKEND_URL}/telemetry/ingest_http",
        "exporter_auth": {
            "type": "bearer",
            "token": "${ingestToken || 'your-token-here'}"  # you can create additional tokens in the Settings page
        }
    }
)

# Define your tools
@mcp.tool()
def get_weather(city: str) -> str:
    """Get weather for a city."""
    return f"Weather for {city}: Sunny"

# Run the server
if __name__ == "__main__":
    mcp.run()`

  const pythonMcpSnippet = `from mcp.server import Server
from shinzo import instrument_server

# Create your MCP server
server = Server("my-mcp-server")

# Instrument it with Shinzo
observability = instrument_server(
    server,
    config={
        "server_name": "my-mcp-server",
        "server_version": "1.0.0",
        "exporter_endpoint": "${BACKEND_URL}/telemetry/ingest_http",
        "exporter_auth": {
            "type": "bearer",
            "token": "${ingestToken || 'your-token-here'}"  # you can create additional tokens in the Settings page
        }
    }
)

# Define your tools
@server.call_tool()
async def get_weather(city: str) -> str:
    return f"Weather for {city}: Sunny"

# Clean shutdown
async def shutdown():
    await observability.shutdown()`

  const getCurrentSnippet = () => {
    switch (sdkType) {
      case 'python-fastmcp':
        return pythonFastMcpSnippet
      case 'python-mcp':
        return pythonMcpSnippet
      default:
        return typescriptSnippet
    }
  }

  return (
    <AppLayout>
      <Flex direction="column" gap="6">
        {/* Header section with video on the right */}
        <Flex gap="6" align="start">
          {/* Left: Header and success banner */}
          <Flex direction="column" gap="4" style={{ flex: 1 }}>
            {/* Page header */}
            <Box>
              <Heading size="6">Getting Started</Heading>
              <Text color="gray">
                Set up your MCP server with Shinzo Platform in under 60 seconds
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
          </Flex>

          {/* Right: Video tutorial */}
          <Box style={{
            width: '400px',
            height: '225px',
            flexShrink: 0
          }}>
            <iframe
              src="https://www.youtube.com/embed/ngv4QTURY6c"
              title="Get Onboarded to the Shinzo Analytics Platform in 60 Seconds or Less"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: 'var(--radius-3)'
              }}
            />
          </Box>
        </Flex>

        {/* Step 1: Choose Your SDK */}
        <Card>
          <Flex direction="column" gap="3">
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
              <Heading size="4">Choose Your SDK</Heading>
            </Flex>
            <Text color="gray" size="2">
              Select the programming language and framework for your MCP server
            </Text>
            <Tabs.Root value={sdkType} onValueChange={(value) => setSdkType(value as SdkType)}>
              <Tabs.List>
                <Tabs.Trigger value="typescript">TypeScript</Tabs.Trigger>
                <Tabs.Trigger value="python-fastmcp">Python (FastMCP)</Tabs.Trigger>
                <Tabs.Trigger value="python-mcp">Python (Core MCP SDK)</Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>

            {sdkType === 'typescript' && (
              <>
                <Text size="2">
                  The TypeScript SDK provides seamless integration with MCP servers built using the official MCP SDK.
                  Perfect for Node.js and TypeScript projects.
                </Text>
                <Flex gap="2" align="center">
                  <Code style={{ flex: 1, padding: '12px' }}>
                    npm install @shinzolabs/instrumentation-mcp
                  </Code>
                  <Button
                    variant="soft"
                    onClick={() => copyToClipboard('npm install @shinzolabs/instrumentation-mcp', 'ts-install-step1')}
                  >
                    <Icons.CopyIcon />
                    {copiedStates['ts-install-step1'] ? 'Copied!' : 'Copy'}
                  </Button>
                </Flex>
              </>
            )}

            {sdkType === 'python-fastmcp' && (
              <>
                <Text size="2">
                    The FastMCP SDK provides a simple, modern Python API with decorators like <Code>@mcp.tool()</Code>.
                    Recommended for new Python projects.
                  </Text>
                  <Flex gap="2" align="center">
                      <Code style={{ flex: 1, padding: '12px' }}>
                        pip install fastmcp 
                      </Code>
                      <Button
                        variant="soft"
                        onClick={() => copyToClipboard('pip install fastmcp', 'fastmcp-install-step1')}
                      >
                        <Icons.CopyIcon />
                        {copiedStates['fastmcp-install-step1'] ? 'Copied!' : 'Copy'}
                      </Button>
                    </Flex>
                </>
            )}

            {sdkType === 'python-mcp' && (
              <>
                <Text size="2">
                  The Core MCP SDK follows the standard MCP specification with async patterns.
                  Use this if you need more configuration options or are working with existing MCP SDK code.
                </Text>
                <Flex gap="2" align="center">
                  <Code style={{ flex: 1, padding: '12px' }}>
                    pip install mcp
                  </Code>
                  <Button
                    variant="soft"
                    onClick={() => copyToClipboard('pip install mcp', 'mcp-install-step1')}
                  >
                    <Icons.CopyIcon />
                    {copiedStates['mcp-install-step1'] ? 'Copied!' : 'Copy'}
                  </Button>
                </Flex>
              </>
            )}
          </Flex>
        </Card>

        {/* Step 2: Install SDK */}
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
              <Heading size="4">Install the SDK</Heading>
            </Flex>

            <Text color="gray">
              {sdkType === 'typescript'
                ? 'Add the Shinzo instrumentation SDK to your TypeScript MCP server:'
                : 'Install the Shinzo Python SDK using pip:'}
            </Text>

            {sdkType === 'typescript' ? (
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
                        onClick={() => copyToClipboard('npm install @shinzolabs/instrumentation-mcp', 'npm-install')}
                      >
                        <Icons.CopyIcon />
                        {copiedStates['npm-install'] ? 'Copied!' : 'Copy'}
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
                        onClick={() => copyToClipboard('pnpm add @shinzolabs/instrumentation-mcp', 'pnpm-install')}
                      >
                        <Icons.CopyIcon />
                        {copiedStates['pnpm-install'] ? 'Copied!' : 'Copy'}
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
                        onClick={() => copyToClipboard('yarn add @shinzolabs/instrumentation-mcp', 'yarn-install')}
                      >
                        <Icons.CopyIcon />
                        {copiedStates['yarn-install'] ? 'Copied!' : 'Copy'}
                      </Button>
                    </Flex>
                  </Tabs.Content>
                </Box>
              </Tabs.Root>
            ) : (
              <Flex gap="2" align="center">
                <Code style={{ flex: 1, padding: '12px' }}>
                  pip install shinzo
                </Code>
                <Button
                  variant="soft"
                  onClick={() => copyToClipboard('pip install shinzo', 'python-install')}
                >
                  <Icons.CopyIcon />
                  {copiedStates['python-install'] ? 'Copied!' : 'Copy'}
                </Button>
              </Flex>
            )}
          </Flex>
        </Card>

        {/* Step 3: Add to your code */}
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
                {getCurrentSnippet()}
              </Code>
              <Button
                variant="soft"
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px'
                }}
                onClick={() => copyToClipboard(getCurrentSnippet(), 'code-snippet')}
              >
                <Icons.CopyIcon />
                {copiedStates['code-snippet'] ? 'Copied!' : 'Copy'}
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

        {/* Step 4: Run and verify */}
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
              <Heading size="4">Run Your Server & Verify</Heading>
            </Flex>

            <Text color="gray">
              Start your MCP server as usual. Telemetry data will automatically be sent to Shinzo Platform when
            </Text>

            <Flex direction="column" gap="2" style={{ paddingLeft: '20px' }}>
              <Flex align="center" gap="2">
                <Icons.CheckIcon color="var(--green-9)" />
                <Text size="2">Tools are executed</Text>
              </Flex>
              <Flex align="center" gap="2">
                <Icons.CheckIcon color="var(--green-9)" />
                <Text size="2">Errors occur</Text>
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

        <Card style={{
          backgroundColor: hasTelemetry ? 'var(--green-2)' : 'var(--gray-2)',
          borderColor: hasTelemetry ? 'var(--green-6)' : 'var(--gray-6)'
        }}>
          <Flex direction="column" gap="4">
            <Flex align="center" gap="3">
              <Flex
                align="center"
                justify="center"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: hasTelemetry ? 'var(--green-3)' : 'var(--blue-3)',
                  borderRadius: '50%',
                  color: hasTelemetry ? 'var(--green-9)' : 'var(--blue-9)',
                  fontWeight: 'bold'
                }}
              >
                {hasTelemetry ? <Icons.CheckIcon width="20" height="20" /> : '5'}
              </Flex>
              <Heading size="4">See Live Telemetry via the Dashboard</Heading>
            </Flex>

            {hasTelemetry ? (
              <>
                <Callout.Root color="green">
                  <Callout.Icon>
                    <Icons.CheckCircledIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    <Text weight="bold">Great! We're receiving telemetry from your server!</Text>
                    <Text size="2" style={{ marginTop: '4px', display: 'block' }}>
                      Click the button below to view your data in the Dashboard.
                    </Text>
                  </Callout.Text>
                </Callout.Root>
                <Button
                  variant="solid"
                  size="3"
                  color="green"
                  onClick={() => window.location.href = '/dashboard'}
                  style={{ alignSelf: 'flex-start' }}
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
                    <Text weight="medium">Waiting for telemetry data...</Text>
                    <Text size="2" color="gray">
                      Once your MCP server sends data, the Dashboard will be unlocked automatically.
                    </Text>
                  </Flex>
                </Flex>
                <Callout.Root>
                  <Callout.Icon>
                    <Icons.InfoCircledIcon />
                  </Callout.Icon>
                  <Callout.Text>
                    <Text size="2">
                      Make sure your MCP server is running with the instrumentation code from Step 2.
                      The platform is actively checking for incoming telemetry events every 5 seconds.
                    </Text>
                  </Callout.Text>
                </Callout.Root>
              </>
            )}
          </Flex>
        </Card>
      </Flex>
    </AppLayout>
  )
}