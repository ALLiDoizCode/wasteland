# Multi-stage build for demo-agent

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/wasteland-client/package.json ./packages/wasteland-client/
COPY packages/demo-agent/package.json ./packages/demo-agent/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY tsconfig.json ./
COPY packages/wasteland-client/ ./packages/wasteland-client/
COPY packages/demo-agent/ ./packages/demo-agent/

# Build packages
RUN pnpm -r build

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY packages/wasteland-client/package.json ./packages/wasteland-client/
COPY packages/demo-agent/package.json ./packages/demo-agent/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built artifacts from builder
COPY --from=builder /app/packages/wasteland-client/dist ./packages/wasteland-client/dist
COPY --from=builder /app/packages/demo-agent/dist ./packages/demo-agent/dist

# Set working directory to demo-agent
WORKDIR /app/packages/demo-agent

# Make the CLI executable
RUN chmod +x dist/index.js

# Default command (can be overridden in docker-compose)
ENTRYPOINT ["node", "dist/index.js"]
CMD ["start"]
