FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
  build-base \
  python3 \
  make \
  git \
  ffmpeg

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Make migration script executable
RUN chmod +x ./apply_migrations.sh

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', res => process.exit(res.statusCode === 200 ? 0 : 1))"

# Run migrations then start app
ENTRYPOINT ["./apply_migrations.sh"]
CMD ["npm", "run", "dev"]
  