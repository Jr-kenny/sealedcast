# https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile
FROM node:24-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install exactly the dependency graph recorded in package-lock.json.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
  npm ci --legacy-peer-deps --ignore-scripts \
    --fetch-retries=5 \
    --fetch-retry-mintimeout=20000


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_FC_CLIENT_NAME=SealedCast
ARG NEXT_PUBLIC_WALLETCONNECT_ID
ARG NEXT_PUBLIC_NEYNAR_CLIENT_ID
ARG NEXT_PUBLIC_URL
ARG NEXT_PUBLIC_SEPOLIA_RPC_URL
ARG NEXT_PUBLIC_SEALED_CAST_REGISTRY_ADDRESS

ENV NEXT_PUBLIC_FC_CLIENT_NAME=$NEXT_PUBLIC_FC_CLIENT_NAME
ENV NEXT_PUBLIC_WALLETCONNECT_ID=$NEXT_PUBLIC_WALLETCONNECT_ID
ENV NEXT_PUBLIC_NEYNAR_CLIENT_ID=$NEXT_PUBLIC_NEYNAR_CLIENT_ID
ENV NEXT_PUBLIC_URL=$NEXT_PUBLIC_URL
ENV NEXT_PUBLIC_SEPOLIA_RPC_URL=$NEXT_PUBLIC_SEPOLIA_RPC_URL
ENV NEXT_PUBLIC_SEALED_CAST_REGISTRY_ADDRESS=$NEXT_PUBLIC_SEALED_CAST_REGISTRY_ADDRESS

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
