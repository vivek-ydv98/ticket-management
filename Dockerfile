# Base image
FROM oven/bun:1.1-alpine AS base
WORKDIR /app

# Stage 1: Build client and generate prisma client
FROM base AS builder

# Copy package configurations
COPY core/package.json ./core/
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install client dependencies and build
COPY client/ ./client/
COPY core/ ./core/
WORKDIR /app/client
RUN bun install
RUN bun run build

# Install server dependencies and generate Prisma
COPY server/ ./server/
WORKDIR /app/server
RUN bun install
RUN bunx prisma generate

# Stage 2: Production runner
FROM base AS runner
# Copy built files
COPY core/ ./core
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server ./server

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Start command
WORKDIR /app/server
CMD ["sh", "-c", "bunx prisma db push && bun run index.ts"]
