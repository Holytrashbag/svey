# syntax=docker/dockerfile:1

# ── Builder: install deps, compile TypeScript, produce a prod-only bundle ──
FROM node:26-alpine AS builder
# Node 25+ no longer bundles corepack; it pins pnpm from package.json's
# packageManager field.
RUN npm install -g corepack@0.36.0 && corepack enable
WORKDIR /repo

# Copy the whole monorepo. The root .dockerignore keeps node_modules, dist,
# env files and other cruft out of the build context.
COPY . .

# Install with the committed lockfile, compile the API to dist/, then create a
# self-contained production bundle (prod deps + built output) in /app.
RUN pnpm install --frozen-lockfile \
 && pnpm --filter api build \
 && pnpm --filter api deploy --legacy --prod /app

# tsc compiles .ts only; the migration runner expects the .sql files next to
# the compiled migrate.js at dist/db/migrations.
RUN cp -r /app/db/migrations /app/dist/db/migrations

# ── Runtime: minimal image running as the non-root node user ──
FROM node:26-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder --chown=node:node /app /app

# Make the entrypoint executable and pre-create the uploads mount point so the
# named volume inherits node ownership the first time it is mounted.
RUN chmod +x /app/docker-entrypoint.sh \
 && mkdir -p /data/uploads \
 && chown -R node:node /data

USER node
EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
