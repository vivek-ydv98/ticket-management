# Base image
FROM oven/bun:alpine AS base
WORKDIR /app

# Stage 1: Build client and generate prisma client
FROM base AS builder

# Copy configurations for workspaces
COPY package.json bun.lock ./
COPY core/package.json ./core/
COPY client/package.json ./client/
COPY server/package.json ./server/

# Copy all source files first so they are present during compilation and local resolution
COPY core/ ./core/
COPY client/ ./client/
COPY server/ ./server/

# Install all workspace dependencies
RUN bun install

# Build client
WORKDIR /app/client
RUN bun run build

# Generate Prisma Client
WORKDIR /app/server
RUN bunx prisma generate

# Stage 2: Production runner
FROM base AS runner
# Copy built files and hoisted node_modules
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
