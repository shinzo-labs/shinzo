FROM node:lts

WORKDIR /app

RUN npm install -g pnpm

COPY --chown=node:node ["./package.json", "./pnpm-lock.yaml", "./"]

RUN pnpm fetch
RUN pnpm install -r --offline

COPY --chown=node:node ["./", "./"]

RUN pnpm run build

ENTRYPOINT ["pnpm", "run", "start"]
