# ============================================================
# mission-control — UI only (Option A)
# Gateway runs natively on POWER
# ============================================================

# Stage 1: deps
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: builder
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Branding vars baked in at build time
ARG NEXT_PUBLIC_AGENT_NAME="Mission Control"
ARG NEXT_PUBLIC_AGENT_EMOJI="🤖"
ARG NEXT_PUBLIC_AGENT_DESCRIPTION="OpenClaw Mission Control"
ARG NEXT_PUBLIC_AGENT_LOCATION=""
ARG NEXT_PUBLIC_OWNER_USERNAME=""
ARG NEXT_PUBLIC_OWNER_EMAIL=""
ARG NEXT_PUBLIC_OWNER_COLLAB_EMAIL=""
ARG NEXT_PUBLIC_TWITTER_HANDLE=""
ARG NEXT_PUBLIC_COMPANY_NAME="MISSION CONTROL, INC."
ARG NEXT_PUBLIC_APP_TITLE="Mission Control"

ENV NEXT_PUBLIC_AGENT_NAME=$NEXT_PUBLIC_AGENT_NAME
ENV NEXT_PUBLIC_AGENT_EMOJI=$NEXT_PUBLIC_AGENT_EMOJI
ENV NEXT_PUBLIC_AGENT_DESCRIPTION=$NEXT_PUBLIC_AGENT_DESCRIPTION
ENV NEXT_PUBLIC_AGENT_LOCATION=$NEXT_PUBLIC_AGENT_LOCATION
ENV NEXT_PUBLIC_OWNER_USERNAME=$NEXT_PUBLIC_OWNER_USERNAME
ENV NEXT_PUBLIC_OWNER_EMAIL=$NEXT_PUBLIC_OWNER_EMAIL
ENV NEXT_PUBLIC_OWNER_COLLAB_EMAIL=$NEXT_PUBLIC_OWNER_COLLAB_EMAIL
ENV NEXT_PUBLIC_TWITTER_HANDLE=$NEXT_PUBLIC_TWITTER_HANDLE
ENV NEXT_PUBLIC_COMPANY_NAME=$NEXT_PUBLIC_COMPANY_NAME
ENV NEXT_PUBLIC_APP_TITLE=$NEXT_PUBLIC_APP_TITLE

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 3: runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# data dir for runtime JSON files
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
