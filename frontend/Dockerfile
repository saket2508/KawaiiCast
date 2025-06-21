# ----- Dockerfile -----
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
    
# Dev target
FROM base AS dev
# bind‐mount code and dev‐only deps
RUN npm install --legacy-peer-deps
CMD ["npm", "run", "dev"]
    
# Prod target
FROM base AS builder
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build
    
FROM node:18-alpine AS runner
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app ./
CMD ["npm", "start"]
    