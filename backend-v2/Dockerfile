# syntax=docker/dockerfile:1.4

FROM oven/bun:1 AS deps
WORKDIR /app
COPY bun.lock package.json ./
RUN bun install --ci

FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM node:20-slim AS runner
WORKDIR /app
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg postgresql-client && \
    rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json bun.lock tsconfig.json ./

# Make migration script executable
COPY apply_migrations.sh ./apply_migrations.sh
COPY migrations ./migrations
COPY database.sql ./database.sql
RUN chmod +x ./apply_migrations.sh

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', res => process.exit(res.statusCode === 200 ? 0 : 1))"

# Run migrations then start app
ENTRYPOINT ["./apply_migrations.sh"]
CMD ["node", "-r", "tsconfig-paths/register", "dist/index.js"]
