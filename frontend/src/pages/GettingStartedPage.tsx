import React, { useState, useEffect } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { Flex, Text, Tabs, Button, Callout, Spinner } from '@radix-ui/themes'
import * as Icons from '@radix-ui/react-icons'
import { useAuth } from '../contexts/AuthContext'
import { ingestTokenService, telemetryService } from '../backendService'
import { subHours } from 'date-fns'
import { BACKEND_URL } from '../config'
import { OnboardingHeader, OnboardingStep, CodeSnippet } from '../components/onboarding'

type SdkType = 'typescript' | 'python-mcp' | 'python-fastmcp'

export const GettingStartedPage: React.FC = () => {
  const { token } = useAuth()
  const [ingestToken, setIngestToken] = useState<string>('')
  const [loading, setLoading] = useState(true)
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
        <OnboardingHeader
          title="Getting Started"
          description="Set up your MCP server with Shinzo Platform in under 60 seconds"
          successMessage="Your ingest token has been automatically generated! Copy the code below and start sending telemetry data."
          showSuccess={!!ingestToken}
          videoUrl="https://www.youtube.com/embed/ngv4QTURY6c"
          videoTitle="Get Onboarded to the Shinzo Analytics Platform in 60 Seconds or Less"
        />

        {/* Step 1: Choose Your SDK */}
        <OnboardingStep
          stepNumber={1}
          title="Choose Your SDK"
          description="Select the programming language and framework for your MCP server"
        >
          <Tabs.Root value={sdkType} onValueChange={(value) => setSdkType(value as SdkType)}>
            <Tabs.List>
              <Tabs.Trigger value="typescript" style={{ cursor: 'pointer' }}>TypeScript</Tabs.Trigger>
              <Tabs.Trigger value="python-fastmcp" style={{ cursor: 'pointer' }}>Python (FastMCP)</Tabs.Trigger>
              <Tabs.Trigger value="python-mcp" style={{ cursor: 'pointer' }}>Python (Core MCP SDK)</Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>

          {sdkType === 'typescript' && (
            <Text size="2">
              The TypeScript SDK provides seamless integration with MCP servers built using the official MCP SDK.
              Perfect for Node.js and TypeScript projects.
            </Text>
          )}

          {sdkType === 'python-fastmcp' && (
            <Text size="2">
              The FastMCP SDK provides a simple, modern Python API with decorators.
              Recommended for new Python projects.
            </Text>
          )}

          {sdkType === 'python-mcp' && (
            <Text size="2">
              The Core MCP SDK follows the standard MCP specification with async patterns.
              Use this if you need more configuration options or are working with existing MCP SDK code.
            </Text>
          )}
        </OnboardingStep>

        {/* Step 2: Install SDK */}
        <OnboardingStep
          stepNumber={2}
          title="Install the SDK"
          description={sdkType === 'typescript'
            ? 'Add the Shinzo instrumentation SDK to your TypeScript MCP server'
            : 'Install the Shinzo Python SDK using pip'}
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
                    code="npm install @shinzolabs/instrumentation-mcp"
                    copyId="npm-install"
                    inline
                  />
                </Tabs.Content>

                <Tabs.Content value="pnpm">
                  <CodeSnippet
                    code="pnpm add @shinzolabs/instrumentation-mcp"
                    copyId="pnpm-install"
                    inline
                  />
                </Tabs.Content>

                <Tabs.Content value="yarn">
                  <CodeSnippet
                    code="yarn add @shinzolabs/instrumentation-mcp"
                    copyId="yarn-install"
                    inline
                  />
                </Tabs.Content>
              </Flex>
            </Tabs.Root>
          ) : (
            <CodeSnippet
              code="pip install shinzo"
              copyId="python-install"
              inline
            />
          )}
        </OnboardingStep>

        {/* Step 3: Add to your code */}
        <OnboardingStep
          stepNumber={3}
          title="Add Telemetry to Your Server"
          description="Import and initialize Shinzo instrumentation in your MCP server"
        >
          <CodeSnippet
            code={getCurrentSnippet()}
            copyId="code-snippet"
          />

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
        </OnboardingStep>

        {/* Step 4: Run and verify */}
        <OnboardingStep
          stepNumber={4}
          title="Run Your Server & Verify"
          description="Start your MCP server as usual. Telemetry data will automatically be sent to Shinzo Platform when"
        >
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
        </OnboardingStep>

        {/* Step 5: See Live Telemetry */}
        <OnboardingStep
          stepNumber={
            hasTelemetry ? (
              <Icons.CheckIcon width="20" height="20" />
            ) : (
              5
            )
          }
          title="See Live Telemetry via the Dashboard"
          variant={hasTelemetry ? 'success' : 'pending'}
        >
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
                onClick={() => window.location.href = '/spotlight/session-analytics'}
                style={{ alignSelf: 'flex-start', cursor: 'pointer' }}
              >
                <Icons.DashboardIcon />
                <span style={{ marginLeft: 8 }}>View Analytics</span>
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
        </OnboardingStep>
      </Flex>
    </AppLayout>
  )
}