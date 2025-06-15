FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && apk add --no-cache postgresql-client bash

# Copy application code
COPY . .

# Copy custom entrypoint script and make it executable
RUN chmod +x apply_migrations.sh

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Set entrypoint to run migrations then start app
ENTRYPOINT ["./apply_migrations.sh"]

# Default command starts the application
CMD ["npm", "start"] 