# syntax=docker/dockerfile:1

# ── Builder: build the Vue SPA ──
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /repo

COPY . .

# Baked into the bundle at build time: the SPA calls `${VITE_API_URL}/api/...`
# and Better Auth uses it as its baseURL. Set this to your public origin
# (same origin as the SPA), e.g. https://svey.app
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Operator contact details for the Impressum/Datenschutz pages, baked into the
# bundle so they never live in the repository (see src/lib/legal-contact.ts).
ARG VITE_LEGAL_NAME
ARG VITE_LEGAL_STREET
ARG VITE_LEGAL_CITY
ARG VITE_LEGAL_EMAIL
ARG VITE_LEGAL_PHONE
ENV VITE_LEGAL_NAME=${VITE_LEGAL_NAME} \
    VITE_LEGAL_STREET=${VITE_LEGAL_STREET} \
    VITE_LEGAL_CITY=${VITE_LEGAL_CITY} \
    VITE_LEGAL_EMAIL=${VITE_LEGAL_EMAIL} \
    VITE_LEGAL_PHONE=${VITE_LEGAL_PHONE}

RUN pnpm install --frozen-lockfile \
 && pnpm --filter frontend build-only

# ── Runtime: Caddy serving the static build (Caddyfile mounted via compose) ──
FROM caddy:2-alpine
COPY --from=builder /repo/apps/frontend/dist /srv
