# Base image
FROM oven/bun:1.1-alpine AS base
WORKDIR /app

# Stage 1: Build client and generate prisma client
FROM base AS builder
COPY package.json bun.lock ./
COPY core/package.json ./core/
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install dependencies for all packages
RUN bun install

# Copy source files
COPY core/ ./core/
COPY client/ ./client/
COPY server/ ./server/

# Build client
WORKDIR /app/client
RUN bun run build

# Generate Prisma Client
WORKDIR /app/server
RUN bunx prisma generate

# Stage 2: Production runner
FROM base AS runner
# Copy built files and node_modules from builder
COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/core ./core
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Start command
WORKDIR /app/server
CMD ["sh", "-c", "bunx prisma db push && bun run index.ts"]
