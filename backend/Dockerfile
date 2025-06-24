# ---- Base for Dev (includes all deps) ----
  FROM node:18-alpine AS base-dev

  WORKDIR /app

  # 1) Add Alpine build toolchain for native addons
  RUN apk add --no-cache \
    build-base \
    python3 \
    make \
    git \
    ffmpeg

  COPY package*.json ./
  
  # install dev + prod deps
  RUN npm install --legacy-peer-deps
  
  # ---- Dev Stage ----
  FROM base-dev AS dev
  
  # copy your source for live-reload
  COPY . .
  
  # mark dev mode
  ENV NODE_ENV=development
  
  EXPOSE 8080
  
  # assumes you have a "dev" script (e.g. nodemon)
  CMD ["npm", "run", "dev"]
  
  # ---- Prod Dependencies Stage ----
  FROM node:18-alpine AS deps-prod
  
  WORKDIR /app
  COPY package*.json ./
  
  # install only prod deps
  RUN npm ci --legacy-peer-deps

  # ---- Prod Stage ----
  FROM node:18-alpine AS prod
  
  WORKDIR /app
  
  # bring in only prod deps
  COPY --from=deps-prod /app/node_modules ./node_modules
  # then application code
  COPY . .
  
  # install ffprobe for subtitle extraction
  RUN apk add --no-cache ffmpeg
  
  # ensure migrations script is executable
  RUN chmod +x apply_migrations.sh
  
  ENV NODE_ENV=production
  
  EXPOSE 8080
  
  HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', res => process.exit(res.statusCode === 200 ? 0 : 1))"
  
  ENTRYPOINT ["./apply_migrations.sh"]
  CMD ["npm", "start"]
  