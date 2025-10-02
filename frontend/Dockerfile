# Build stage
FROM node:lts AS build

WORKDIR /app

RUN npm install -g pnpm

COPY --chown=node:node ["./package.json", "./pnpm-lock.yaml", "./"]

RUN pnpm fetch
RUN pnpm install -r --offline

COPY --chown=node:node ["./", "./"]

# Accept build arguments for environment-specific configuration
ARG REACT_APP_BACKEND_URL=https://api.app.shinzo.ai
ARG REACT_APP_LOG_LEVEL=info
ARG REACT_APP_REFRESH_INTERVAL_MS=5000
ARG REACT_APP_MAX_CACHE_AGE=300000
ARG REACT_APP_ENABLE_REALTIME=true
ARG REACT_APP_DEFAULT_TIME_RANGE=1h

RUN pnpm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
