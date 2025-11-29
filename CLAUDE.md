# Overview

The Shinzo Platform is a full-stack web platform that allows users to ingest OpenTelemetry-compatible data and store and retrieve it for future analysis. For details on the system architecture, see `system_architecture.md`. The overall project is structured as a TypeScript backend, a TypeScript/React frontend, and a Postgres database.

# Tools

To assist with development, there are a couple MCP servers installed that expose certain tools.

## `linear-server`

The Linear MCP server gives access to the Shinzo Labs Linear instance, which is where you will find all the context and details about how to implement features for the Shinzo Platform. Please use the operations available to update ticket details, ask questions, add comments, etc. The tickets for this specific project are available here: `https://linear.app/shinzo-labs/project/shinzo-platform-v1-ddb308bf5e15/issues`.

## `github`

The Github MCP server should enable you to interact with the project codebase on Github. In particular, use this to create branches, open PRs, update PRs, and review commit history (if necessary), among other operations. Aim for 1:1 relationship between Linear tickets and Github PRs/branches. The upstream remote repo is available here: `https://github.com/shinzo-labs/shinzo-platform-v1`.

## `selenium-mcp`

The Selenium MCP server offers tools for operating a browser (Chrome by default on this computer). You can use this to open different application pages, click buttons, take screenshots, and interact with the app. Screenshots should be saved to the local `~/shinzolabs/shinzo-platform-v1/dev/` folder which is specifically for your (developer) use.

## `coinmarketcap-mcp`

This is an MCP server that offers tools to fetch financial crypto data. This is instrumented to export OpenTelemetry data to the backend server so it can be tested like a true live service by a user. Please use this extensively to populate the application as needed with real data for testing. It should already work with my test user (described below)

## `gmail`

An MCP server configured to help read data from the austin@shinzolabs.com email account. Use this to test any email-related features such as email verification or notifications.

## `postgres`

An MCP server configured to connect to the postgres instance running on the local computer. This is a development test DB, so feel free to delete entries as necessary to verify functionality. In addition, you may use this to perform migrations as necessary.

# Environment/Machine

This is a 2025 Macbook Air with an M4 Apple Silicon chip. My computer user is `austin` and the current project path is `/Users/austin/shinzolabs/shinzo-platform-v1`.

# Application

The postgres database is already running locally and all .env configurations are preset for the backend and frontend. All you need to do is build and start the frontend and backend, which should be the 8000 and 3000 PORTs respectively.

My user credentials for testing are:
- Email: austin@shinzolabs.com
- Password: password
- Ingest Token: abc

# Cloud Deployment

The application is deployed to Google Cloud Platform with separate staging and production environments. For complete infrastructure details, see `~/shinzolabs/Cloud-Deployment-Summary.md`.

## Environment-Specific Docker Images

**CRITICAL**: Frontend images must be built with environment-specific configuration because React environment variables are compiled at BUILD time, not runtime.

### Frontend Builds

**Staging:**
```bash
cd ~/shinzolabs/shinzo-platform-v1/frontend
docker buildx build --platform linux/amd64 \
  --build-arg REACT_APP_BACKEND_URL=https://api.app.stage.shinzo.ai \
  --build-arg REACT_APP_LOG_LEVEL=info \
  --build-arg REACT_APP_REFRESH_INTERVAL_MS=5000 \
  --build-arg REACT_APP_MAX_CACHE_AGE=300000 \
  --build-arg REACT_APP_ENABLE_REALTIME=true \
  --build-arg REACT_APP_DEFAULT_TIME_RANGE=1h \
  -t us-central1-docker.pkg.dev/shinzo-platform/shinzo-platform-repo/shinzo-frontend:staging \
  --push .
```

**Production:**
```bash
cd ~/shinzolabs/shinzo-platform-v1/frontend
docker buildx build --platform linux/amd64 \
  --build-arg REACT_APP_BACKEND_URL=https://api.app.shinzo.ai \
  --build-arg REACT_APP_LOG_LEVEL=info \
  --build-arg REACT_APP_REFRESH_INTERVAL_MS=5000 \
  --build-arg REACT_APP_MAX_CACHE_AGE=300000 \
  --build-arg REACT_APP_ENABLE_REALTIME=true \
  --build-arg REACT_APP_DEFAULT_TIME_RANGE=1h \
  -t us-central1-docker.pkg.dev/shinzo-platform/shinzo-platform-repo/shinzo-frontend:production \
  --push .
```

### Backend Builds

Backend uses the same code for both environments (configuration via Kubernetes env vars):

```bash
cd ~/shinzolabs/shinzo-platform-v1/backend

# Staging
docker buildx build --platform linux/amd64 \
  -t us-central1-docker.pkg.dev/shinzo-platform/shinzo-platform-repo/shinzo-backend:staging \
  --push .

# Production
docker buildx build --platform linux/amd64 \
  -t us-central1-docker.pkg.dev/shinzo-platform/shinzo-platform-repo/shinzo-backend:production \
  --push .
```

## Deploying to GKE

**Deploy to Staging:**
```bash
kubectl apply -f ~/shinzolabs/k8s-deployments/platform-stage.yaml
kubectl rollout status deployment/shinzo-platform-backend-stage --timeout=300s
kubectl rollout status deployment/shinzo-platform-frontend-stage --timeout=300s
```

**Deploy to Production:**
```bash
kubectl apply -f ~/shinzolabs/k8s-deployments/platform-prod.yaml
kubectl rollout status deployment/shinzo-platform-backend-prod --timeout=300s
kubectl rollout status deployment/shinzo-platform-frontend-prod --timeout=300s
```

## Environment URLs

**Production (Public):**
- Frontend: https://app.shinzo.ai
- API: https://api.app.shinzo.ai

**Staging (IP Restricted):**
- Frontend: https://app.stage.shinzo.ai
- API: https://api.app.stage.shinzo.ai

## Best Practices

1. **Always deploy to staging first** and test thoroughly
2. **Verify environment isolation** - Staging should use staging backend, production should use production backend
3. **Build fresh images** - Always build both staging and production frontend images with correct `REACT_APP_BACKEND_URL`
4. **Test authentication** - Verify email verification and other environment-specific features work correctly
