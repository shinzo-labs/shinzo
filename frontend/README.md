# Shinzo Web App

## Prerequisites

### Local Deployment
- [pnpm](https://pnpm.io/installation)
- Environment variables configured in `.env` file

## Environment Configuration

Copy the example environment file and configure it:
```bash
cp .env.example .env
```

Key environment variables:
- `PORT` - Frontend server port (default: 3004)
- `REACT_APP_BACKEND_URL` - Backend API URL (default: http://localhost:8000)

### Run Locally
```bash
pnpm i && pnpm run start
```
