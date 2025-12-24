# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./

# Copy shared packages
COPY packages ./packages

# Copy client app
COPY apps/client ./apps/client

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared package first
RUN pnpm --filter @uni/shared build

# Build client (Next.js)
# Note: Next.js build typically needs environment variables for build-time optimization
# but here we'll use the ones provided at runtime or in .env.client
RUN pnpm --filter @uni/client build

# Production Stage
FROM node:20-alpine

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/client/.next ./apps/client/.next
COPY --from=builder /app/apps/client/public ./apps/client/public
COPY --from=builder /app/apps/client/package.json ./apps/client/package.json
COPY --from=builder /app/apps/client/node_modules ./apps/client/node_modules

WORKDIR /app/apps/client

EXPOSE 3000

CMD ["pnpm", "start"]


