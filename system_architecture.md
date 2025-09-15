# System Architecture

The Shinzo application is a full-stack backend application that is used to ingest and present OpenTelemetry traces, spans, logs, and metrics data to end users. It consists of a typescript-based backend server, a postgres database to store the raw user and telemetry data, and a frontend to help users configure their workspace and analyze the data.

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

# Data Model

## Common columns (shared on all tables)

| Column Name | Type | Required | Unique | Description |
| ----------- | ---- | -------- | ------ | ----------- |
| uuid | `uuid` | ✅ | ✅ | Primary key |
| created_at | `timestamp` | ✅ | | |
| updated_at | `timestamp` | ✅ | | Use automatic trigger |

## `main` schema

### `user`
| Column Name | Type | Required | Unique | Description |
| ----------- | ---- | -------- | ------ | ----------- |
| email | `text` | ✅ | ✅ | User communications and links |
| password_hash | `text` | ✅ | ✅ | Hash of the user's password |
| password_salt | `text` | ✅ | ✅ | Unique salt used in hashing the user's password |
| email_token | `text` | ✅ | ✅ | Current token to verify user's email |
| email_token_expiry | `timestamp` | ✅ | ✅ | Expiration time for token |
| verified | `bool` | ✅ | | Whether the user's email has been verified |

## `open_telemetry` schema

### `resource`
| Column Name | Type | Required | Unique | Description |
| ----------- | ---- | -------- | ------ | ----------- |
| user_uuid | `uuid` | ✅ |  | `user.uuid` |
| service_name | `text` | ✅ | | Service name |
| service_version | `text` | | | Service version |
| service_namespace | `text` | | | Service namespace |
| first_seen | `timestamp` | | | First time resource was seen (default: NOW()) |
| last_seen | `timestamp` | | | Last time resource was seen (default: NOW()) |

### `resource_attribute`
| Column Name | Type | Required | Unique | Description |
| ----------- | ---- | -------- | ------ | ----------- |
| resource_uuid | `uuid` | ✅ | | `resource.uuid` |
| key | `text` | ✅ | | Attribute key name |
| value_type | `text` | ✅ | | Value type: 'string', 'int', 'double', 'bool', 'array' |
| string_value | `text` | | | String value (when value_type = 'string') |
| int_value | `integer` | | | Integer value (when value_type = 'int') |
| double_value | `double precision` | | | Double value (when value_type = 'double') |
| bool_value | `boolean` | | | Boolean value (when value_type = 'bool') |
| array_value | `jsonb` | | | Array value (when value_type = 'array') |

### `ingest_token`
| Column Name | Type | Required | Unique | Description |
| ----------- | ---- | -------- | ------ | ----------- |
| user_uuid | `uuid` | ✅ |  | `user.uuid` |
| ingest_token | `text` | ✅ | ✅ | Randomized alphanumeric token for each user's own telemetry ingest use. |
| status | `text` | ✅ |  | Status type: 'live', 'deprecated' |

### `trace`
| Column Name | Type | Required | Unique | Description |
| ----------- | ---- | -------- | ------ | ----------- |
| resource_uuid | `uuid` | ✅ |  | `resource.uuid` |
| ingest_token_uuid | `uuid` | ✅ |  | `ingest_token.uuid` |
| start_time | `timestamp` | ✅ | | Starting time of the trace |
| end_time | `timestamp` | | | Ending time of the trace |
| service_name | `text` | ✅ | | Name of the service |
| operation_name | `text` | | | Name of the operation |
| status | `text` | | | Trace status: 'ok', 'error', 'timeout' |
| span_count | `integer` | | | Number of spans in this trace (default: 0) |
| created_at | `timestamp` | | | Record creation time (default: NOW()) |

### `span`
| Column Name | Type | Required | Unique | Description |
| ----------- | ---- | -------- | ------ | ----------- |
| trace_uuid | `uuid` | ✅ | | `trace.uuid` |
| parent_span_uuid | `uuid` | | | `span.uuid` |
| operation_name | `text` | ✅ | | Name of the operation |
| start_time | `timestamp` | ✅ | | When the span started |
| end_time | `timestamp` | | | When the span ended |
| duration_ms | `integer` | | | Duration in milliseconds |
| status_code | `integer` | | | OpenTelemetry status code |
| status_message | `text` | | | Status message |
| span_kind | `text` | | | Span kind: 'server', 'client', 'producer', etc. |
| service_name | `text` | | | Name of the service |
| created_at | `timestamp` | | | Record creation time (default: NOW()) |

### `span_attribute`
| Column Name | Type | Required | Unique | Description |
| ----------- | ---- | -------- | ------ | ----------- |
| span_uuid | `uuid` | ✅ | | `span.uuid` |
| key | `text` | ✅ | | Attribute key name |
| value_type | `text` | ✅ | | Value type: 'string', 'int', 'double', 'bool', 'array' |
| string_value | `text` | | | String value (when value_type = 'string') |
| int_value | `integer` | | | Integer value (when value_type = 'int') |
| double_value | `double precision` | | | Double value (when value_type = 'double') |
| bool_value | `boolean` | | | Boolean value (when value_type = 'bool') |
| array_value | `jsonb` | | | Array value (when value_type = 'array') |

### `metric`
| Column Name | Type | Required | Unique | Description |
| ----------- | ---- | -------- | ------ | ----------- |
| resource_uuid | `uuid` | ✅ |  | `resource.uuid` |
| ingest_token_uuid | `uuid` | ✅ |  | `ingest_token.uuid` |
| name | `text` | ✅ | | Metric name |
| description | `text` | | | Metric description |
| unit | `text` | | | Metric unit |
| metric_type | `text` | ✅ | | Metric type: 'counter', 'gauge', 'histogram' |
| timestamp | `timestamp` | ✅ | | Metric timestamp |
| value | `double precision` | | | Metric value |
| scope_name | `text` | | | Scope name |
| scope_version | `text` | | | Scope version |

### `metric_attribute`
| Column Name | Type | Required | Unique | Description |
| ----------- | ---- | -------- | ------ | ----------- |
| metric_uuid | `uuid` | ✅ | | `metric.uuid` |
| key | `text` | ✅ | | Attribute key name |
| value_type | `text` | ✅ | | Value type: 'string', 'int', 'double', 'bool', 'array' |
| string_value | `text` | | | String value (when value_type = 'string') |
| int_value | `integer` | | | Integer value (when value_type = 'int') |
| double_value | `double precision` | | | Double value (when value_type = 'double') |
| bool_value | `boolean` | | | Boolean value (when value_type = 'bool') |
| array_value | `jsonb` | | | Array value (when value_type = 'array') |

# API Specification

## Authentication Endpoints

### GET /auth/fetch_user

Retrieves the authenticated user's profile information and account details.

**Authentication:** Required (JWT token)

**Response:**
- `200 OK`: Returns user profile data including email, verification status, and account metadata
- `401 Unauthorized`: Invalid or missing authentication token
- `404 Not Found`: User not found

### POST /auth/login

Authenticates a user with email and password credentials.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
- `200 OK`: Returns JWT token and user session data
- `400 Bad Request`: Invalid request format or missing required fields
- `401 Unauthorized`: Invalid credentials

### POST /auth/create_user

Creates a new user account with email and password. On the server side this should also create a verification token that expires after 24 hours

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
- `201 Created`: User account created successfully, verification email sent
- `400 Bad Request`: Invalid email format or weak password
- `409 Conflict`: Email already exists

### POST /auth/verify_user

Verifies a user's email address using a verification token.

**Request Body:**
```json
{
  "email": "string",
  "verification_token": "string"
}
```

**Response:**
- `200 OK`: Email verified successfully
- `400 Bad Request`: Invalid or expired verification token
- `404 Not Found`: User not found
- `409 Conflict`: Email already verified

## Telemetry Data Retrieval Endpoints

### GET /telemetry/fetch_metrics

Retrieves metrics data with filtering and aggregation options.

**Authentication:** Required (JWT token)

**Query Parameters:**
- `start_time`: ISO 8601 timestamp - Start of time range
- `end_time`: ISO 8601 timestamp - End of time range

**Response:**
- `200 OK`: Returns array of metric data points with metadata
- `400 Bad Request`: Invalid query parameters or time range
- `401 Unauthorized`: Invalid authentication
- `403 Forbidden`: Access denied to requested telemetry endpoint

### GET /telemetry/fetch_spans

Retrieves span data for distributed tracing analysis.

**Authentication:** Required (JWT token)

**Query Parameters:**
- `start_time`: ISO 8601 timestamp - Start of time range
- `end_time`: ISO 8601 timestamp - End of time range

**Response:**
- `200 OK`: Returns array of span data with optional attributes
- `400 Bad Request`: Invalid query parameters or time range
- `401 Unauthorized`: Invalid authentication
- `403 Forbidden`: Access denied to requested telemetry endpoint

### GET /telemetry/fetch_traces

Retrieves trace data with associated span summaries.

**Authentication:** Required (JWT token)

**Query Parameters:**
- `start_time`: ISO 8601 timestamp - Start of time range
- `end_time`: ISO 8601 timestamp - End of time range

**Response:**
- `200 OK`: Returns array of trace data with span count and duration statistics
- `400 Bad Request`: Invalid query parameters or time range
- `401 Unauthorized`: Invalid authentication
- `403 Forbidden`: Access denied to requested telemetry endpoint

### GET /telemetry/fetch_resources

Retrieves resource metadata and service discovery information.

**Authentication:** Required (JWT token)

**Query Parameters:**
- None (return all resource records)

**Response:**
- `200 OK`: Returns array of resource data with optional attributes
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Invalid authentication
- `403 Forbidden`: Access denied to requested telemetry endpoint

## Telemetry Data Ingestion Endpoints

### POST /telemetry/ingest_http

Ingests OpenTelemetry data via HTTP/JSON following OTLP specification.

**Authentication:** Required (Ingest Token)

**Request Headers:**
- `Content-Type: application/json`
- `Ingest-Token: <ingest_token>`

**Request Body:**
OTLP/HTTP JSON format containing traces, metrics, and/or logs data

**Response:**
- `200 OK`: Data ingested successfully
- `400 Bad Request`: Invalid OTLP format or malformed data
- `401 Unauthorized`: Invalid or missing ingest ID

### POST /telemetry/ingest_grpc

Ingests OpenTelemetry data via gRPC following OTLP specification.

**Authentication:** Required (Ingest ID)

**Protocol:** gRPC with protobuf serialization
**Service:** `opentelemetry.proto.collector.v1`

**Methods:**
- `Export`: Accepts OTLP traces, metrics, and logs data

**Response:**
- gRPC status codes following OTLP specification
- Supports streaming and batch ingestion modes
- Automatic compression and connection pooling
