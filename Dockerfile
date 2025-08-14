# Multi-stage build for minimal Docker image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma/ ./prisma/

# Install ALL dependencies (including dev dependencies for building)
RUN npm ci && npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Install MySQL client for health checks and database operations
RUN apk add --no-cache mysql-client

# Copy package files for production install
COPY package*.json ./
COPY prisma/ ./prisma/

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Generate Prisma client for production
RUN npx prisma generate

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Copy database scripts
COPY --chown=nestjs:nodejs scripts/ ./scripts/

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Create entrypoint script for database initialization
USER root
RUN echo '#!/bin/sh\n\
echo "Waiting for database..."\n\
until mysqladmin ping -h"$DATABASE_HOST" --silent; do\n\
  echo "Waiting for database connection..."\n\
  sleep 2\n\
done\n\
echo "Database is ready!"\n\
echo "Running database migrations..."\n\
npx prisma migrate deploy\n\
echo "Database migrations completed!"\n\
exec "$@"\n' > /app/docker-entrypoint.sh && \
chmod +x /app/docker-entrypoint.sh && \
chown nestjs:nodejs /app/docker-entrypoint.sh

USER nestjs

# Start the application with database initialization
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
