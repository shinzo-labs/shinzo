# Shinzo Backend

The Shinzo application uses a backend API server to handle requests from the web app. It can authenticate users for requests and query data from the database and other stored data to resolve requests.

## Prerequisites
- Database set up with actions in [db/README.md](../db/README.md)
- Environment variables configured in `.env` file

## Environment Configuration

Copy the example environment file and configure it:
```bash
cp .env.example .env
```

Key environment variables:
- `BACKEND_PORT` - Server port (default: 8004)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `REDIS_URL` - Redis connection URL (for Docker: redis://redis:6379)
- `OTEL_GRPC_PORT` - OpenTelemetry GRPC port (default: 4317)
- `OTEL_HTTP_PORT` - OpenTelemetry HTTP port (default: 4318)

## Operations

Install packages:
```bash
pnpm i
```

Test server:
```bash
pnpm test
```

Build server:
```bash
pnpm build
```

Start server:
```bash
pnpm start
```

Start server as production:
```bash
pnpm start:prod
```
