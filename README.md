# shinzo-platform-v1

First version of the Shinzo platform for hosted use only.

## Prerequisites

### Database
- PostgreSQL 15+ (running externally, not in Docker)
- See [db/README.md](./db/README.md) for setup instructions

### Docker Deployment
- [Docker](https://docs.docker.com/get-started/#download-and-install-docker)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Local Development
- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/installation)

## Env Configs

Fill out env files with given variables:
- `.env`
- `backend/.env`
- `frontend/.env`

## Quick Start

### 1. Database Setup

Follow steps in [db/README.md](./db/README.md) to set up your external PostgreSQL database.

### 2. Environment Configuration

Copy the example environment files and update them:

```bash
# Backend configuration
cp backend/.env.example backend/.env
# Edit backend/.env with your database URL and other settings

# Frontend configuration
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your API URL and other frontend settings
```

**Important Port Configuration:**
- Backend runs on port **8004** (configurable via `BACKEND_PORT`)
- Frontend runs on port **3004** (configurable via `PORT` in frontend/.env)
- OpenTelemetry GRPC on port **4317** (configurable via `OTEL_GRPC_PORT`)
- OpenTelemetry HTTP on port **4318** (configurable via `OTEL_HTTP_PORT`)

### 3. Local Development

```bash
# Install dependencies
cd backend && pnpm install

# Start the backend
pnpm start
```

### 4. Docker Deployment

```bash
# Start supporting services (Redis, Kafka)
docker-compose up -d redis kafka

# Or start all services including backend and frontend
docker-compose up --build -d
```

### 5. Verify Setup

Check that the backend is running:
```bash
curl http://localhost:8004/health
```

## Managing Services

### Stop all services
```bash
docker-compose down
```

### Start specific service
```bash
docker-compose up -d <backend|frontend|redis|kafka>
```

### View logs
```bash
docker-compose logs -f <service-name>
```

## Troubleshooting

### Database Connection Issues

- **Local development**: Use `localhost` in your DATABASE_URL
- **Docker backend connecting to host database**: Use `host.docker.internal` instead of `localhost` in DATABASE_URL
- **Connection refused**: Ensure PostgreSQL is running and accepting connections on the correct port
- **Authentication failed**: Verify username, password, and database name in DATABASE_URL

### Docker Issues

- If using `sudo` with `docker-compose`, use `sudo -E` to preserve environment variables
- Ensure `pnpm` is up-to-date: `pnpm up --latest`
- For build issues, try: `docker-compose build --no-cache`

### Environment Variables

- Copy `.env.example` files and customize them for your environment
- Ensure JWT_SECRET is set to a secure value in production
- Verify all required environment variables are set
