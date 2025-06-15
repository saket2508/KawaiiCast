# ---- Build Stage ----
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies based on lockfile
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy application source
COPY . .

# Accept API base URL build argument (with sensible default)
ARG NEXT_PUBLIC_API_URL="http://localhost:8080/api"
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build the Next.js application
RUN npm run build

# ---- Production Stage ----
FROM node:18-alpine AS runner

WORKDIR /app

# Reduce image size by installing only production deps
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy built assets from the builder stage
COPY --from=builder /app .

ENV NODE_ENV=production

# Expose Next.js default port
EXPOSE 3000

# Propagate public API env variable to runtime container
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Start the application
CMD ["npm", "start"] 