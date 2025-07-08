# Shinzo

Open source observability for MCP servers with comprehensive OpenTelemetry integration.

## Overview

Shinzo is a drop-in telemetry package for Model Context Protocol (MCP) servers built with the TypeScript SDK. It provides in-depth OpenTelemetry traces, spans, and metrics that can be exported to any OpenTelemetry-compatible ingester.

## Features

- 🔍 **Comprehensive Instrumentation**: Automatic tracing of tool calls, resource reads, and prompt executions
- 📊 **OpenTelemetry Integration**: Full compatibility with OpenTelemetry standards and semantic conventions
- 🔒 **Privacy-First**: Built-in PII sanitization and customizable data processors
- ⚡ **Performance**: Configurable sampling rates and batch processing
- 🎛️ **Flexible Configuration**: Support for multiple exporters and authentication methods
- 📈 **Rich Metrics**: Duration tracking, error rates, and custom metrics
- 🛡️ **Production Ready**: Graceful shutdown, error handling, and resource management

## Installation

```bash
pnpm add shinzo
```

## Quick Start

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { initializeAgentObservability, TelemetryConfig } from "shinzo";

const server = new Server({ name: "example-server", version: "1.0.0" });

const telemetryConfig: TelemetryConfig = {
  serviceName: "my-mcp-server",
  serviceVersion: "1.2.0",
  exporterEndpoint: "https://api.mydomain.com/v1/traces",
  exporterAuth: {
    type: "bearer",
    token: process.env.TELEMETRY_AUTH_TOKEN
  },
  samplingRate: 0.8,
  enablePIISanitization: true,
  customAttributes: {
    environment: process.env.NODE_ENV,
    region: process.env.AWS_REGION
  }
};

const telemetry = initializeAgentObservability(server, telemetryConfig);

// Your tool definitions here
server.tool("my_tool", "Description", schema, handler);

// Graceful shutdown
process.on('SIGINT', async () => {
  await telemetry.shutdown();
  process.exit(0);
});
```

## Configuration

### TelemetryConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `serviceName` | `string` | Yes | Name of your MCP service |
| `serviceVersion` | `string` | Yes | Version of your MCP service |
| `exporterEndpoint` | `string` | Yes | OpenTelemetry exporter endpoint |
| `exporterAuth` | `AuthConfig` | No | Authentication configuration |
| `samplingRate` | `number` | No | Sampling rate (0-1, default: 1.0) |
| `enablePIISanitization` | `boolean` | No | Enable PII sanitization (default: true) |
| `enableUserConsent` | `boolean` | No | Enable user consent tracking (default: false) |
| `customAttributes` | `Record<string, any>` | No | Custom attributes to add to all spans |
| `dataProcessors` | `DataProcessor[]` | No | Custom data processing functions |
| `exporterType` | `'otlp-http' \| 'otlp-grpc' \| 'console'` | No | Exporter type (default: 'otlp-http') |

### Authentication

Shinzo supports multiple authentication methods:

```typescript
// Bearer token
exporterAuth: {
  type: "bearer",
  token: "your-bearer-token"
}

// API Key
exporterAuth: {
  type: "apiKey",
  apiKey: "your-api-key"
}

// Basic auth
exporterAuth: {
  type: "basic",
  username: "username",
  password: "password"
}
```

## Data Processing

Customize how telemetry data is processed before export:

```typescript
const telemetryConfig: TelemetryConfig = {
  // ... other config
  dataProcessors: [
    // Remove sensitive parameters
    (telemetryData) => {
      if (telemetryData.toolName === "sensitive_operation") {
        delete telemetryData.parameters?.apiKey;
      }
      return telemetryData;
    },
    // Add performance categorization
    (telemetryData) => {
      if (telemetryData.duration > 5000) {
        telemetryData.attributes.performance = "slow";
      }
      return telemetryData;
    }
  ]
};
```

## Examples

See the [examples](./examples) directory for complete usage examples:

- [Basic Usage](./examples/basic-usage.ts) - Simple setup with minimal configuration
- [Advanced Usage](./examples/advanced-usage.ts) - Complex configuration with custom metrics
- [Console Exporter](./examples/console-exporter.ts) - Development setup with console output

## OpenTelemetry Semantic Conventions

Shinzo follows the [OpenTelemetry semantic conventions for MCP](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/gen-ai/mcp.md):

- Span names: `{mcp.method.name} {target}`
- Required attributes: `mcp.method.name`, `mcp.session.id`
- Optional attributes: `mcp.tool.name`, `mcp.prompt.name`, `mcp.request.id`

## Metrics

Shinzo automatically collects these metrics:

- `mcp.tool.operation.duration` - Tool execution duration
- `mcp.resource.operation.duration` - Resource read duration  
- `mcp.prompt.operation.duration` - Prompt execution duration

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Run tests
pnpm test

# Lint
pnpm run lint

# Watch mode
pnpm run dev

# Type checking
pnpm run type-check

# Clean build artifacts
pnpm run clean
```

## Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.
