FROM node:22-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# The preinstall hook runs this Node version guard.
COPY scripts/check-node-version.ts ./scripts/
# better-sqlite3 ships a prebuilt linuxmusl binary, so no build tools are needed.
RUN HUSKY=0 pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
# The database volume mounts here; owning the mount point lets a new named
# volume start out writable by the app.
RUN mkdir /data && chown nextjs:nodejs /data
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Applied at startup by instrumentation.ts.
COPY --from=builder /app/db/migrations ./db/migrations
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_PATH=/data/harborstats.db
CMD ["node", "server.js"]
