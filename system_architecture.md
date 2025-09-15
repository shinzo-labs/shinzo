# System Architecture

## OpenTelemetry Ingestion Service and Storage

### Primary Dependencies

#### Database and Storage

**Primary Choice: PostgreSQL**
- `pg`: PostgreSQL client for Node.js
- `dbmate`: Database schema migration management

**Rationale:** PostgreSQL provides ACID guarantees, rich querying capabilities, and excellent JSON support for telemetry attributes. Its mature ecosystem and performance characteristics make it ideal for both relational and time-series data.

**Alternatives:**
- MySQL: Good performance but less advanced JSON capabilities
- MariaDB: MySQL-compatible with additional features but smaller ecosystem
- SQLite: Lightweight option for single-node deployments but limited scalability

#### Message Queue and Processing

**Primary Choice: Apache Kafka**
- `kafkajs`: Modern Kafka client for Node.js
- `@kafkajs/confluent-schema-registry`: Schema registry integration

**Rationale:** Kafka provides high-throughput, fault-tolerant message streaming with excellent durability guarantees. Essential for handling large volumes of telemetry data with reliable delivery and replay capabilities.

**Alternatives:**
- RabbitMQ: Simpler deployment and lower latency but less throughput capacity
- Amazon SQS: Managed option but vendor lock-in and higher latency

#### API Framework

**Primary Choice: Fastify**
- `fastify`: Fast, low-overhead web framework
- `@fastify/swagger`: OpenAPI documentation generation
- `@fastify/rate-limit`: Rate limiting middleware

**Rationale:** Fastify provides excellent performance with built-in schema validation, making it ideal for high-throughput telemetry ingestion while maintaining type safety.

**Alternative:**
- Express.js: More ecosystem plugins but slower performance

### P1: Data Model with Agent-Focused Semantic Conventions
The ingestion service must implement a relational data model optimized for AI agent telemetry with proper indexing for time-series queries and analytical workloads.

### P1: OTel Ingestion Service

The ingestion service must implement OTLP (OpenTelemetry Protocol) endpoints that can receive telemetry data from SDK instances with proper authentication and validation.

### Configuration Options

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| port | number | No | 4318 | HTTP port for OTLP ingestion |
| grpcPort | number | No | 4317 | gRPC port for OTLP ingestion |
| maxPayloadSize | string | No | "4mb" | Maximum payload size |
| rateLimitPerMinute | number | No | 1000 | Rate limit per API key |
| enableCompression | boolean | No | true | Enable gzip compression |
| batchTimeout | number | No | 5000 | Batch processing timeout (ms) |
| maxBatchSize | number | No | 1000 | Maximum batch size |

### P1: Data Retrieval

The service must provide RESTful APIs for querying telemetry data with support for filtering, aggregation, and time-range queries optimized for dashboard consumption.

## Observability Frontend

### Primary Dependencies

#### Frontend Framework

**Primary Choice: React**
- React and React DOM: Core React library
- recharts: Chart library for data visualization

**Rationale:** React provides a mature ecosystem with extensive tooling and component libraries. The declarative approach and virtual DOM make it ideal for complex, data-intensive dashboards with real-time updates.

**Alternatives:**
- Svelte: Better performance and smaller bundle sizes but less mature ecosystem for enterprise dashboards
- Vue.js: Similar capabilities but smaller ecosystem for complex data visualization components

#### UI Component Library

**Primary Choice: Material-UI (MUI)**
- `@mui/material`: Core Material-UI components
- `@mui/icons-material`: Material Design icons
- `@mui/mui-x`: Advanced data and chart components

**Rationale:** Material-UI provides comprehensive, accessible components with excellent TypeScript support. The data grid and chart components are particularly well-suited for observability dashboards.

**Alternatives:**
- Ant Design: Rich component set but heavier bundle size
- Chakra UI: Simpler API but fewer specialized components for data visualization

#### Styling/Theme

**Primary Choice: Emotion**
- `@emotion/react`: CSS-in-JS library
- `@emotion/styled`: Styled components

**Alternative:**
- Tailwind CSS: Utility-first approach for custom designs

### P2: Frontend Data Fetching

The frontend must implement efficient data fetching patterns with caching and real-time updates to provide responsive dashboard experiences.

### Configuration Options

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| apiBaseUrl | string | Yes | - | Base URL for the ingestion service API |
| refreshInterval | number | No | 30000 | Dashboard refresh interval (ms) |
| maxCacheAge | number | No | 300000 | Maximum cache age (ms) |
| enableRealtime | boolean | No | false | Enable WebSocket real-time updates |
| defaultTimeRange | string | No | "1h" | Default time range for queries |

### P2: Dashboards

The frontend must provide comprehensive visualization capabilities including time-series charts, trace analysis, tool usage statistics, and performance metrics with interactive filtering and drill-down capabilities. These may cover everything from tool calls to context word clouds to environment data histograms (model, client, runtime, etc) and more.

## Advanced Configuration and Deployment

### P2: Auth and Rate Limiting

The ingestion service must implement robust authentication and rate limiting to prevent abuse and ensure service availability.

### Configuration Options

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| authProvider | enum | Yes | - | Authentication provider: "jwt", "apikey", "oauth2" |
| jwtSecret | string | Conditional | - | JWT signing secret (required if authProvider="jwt") |
| apiKeyStore | enum | No | "database" | API key storage: "database", "redis", "memory" |
| rateLimitWindow | number | No | 60000 | Rate limit window in milliseconds |
| rateLimitMax | number | No | 1000 | Maximum requests per window |
| rateLimitByKey | boolean | No | true | Apply rate limits per API key |
| enableIPRateLimit | boolean | No | true | Enable IP-based rate limiting |
