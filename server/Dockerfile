# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

# Copy manifests first to leverage layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# ─── Production image ─────────────────────────────────────────────────────────
FROM node:20-alpine AS final
WORKDIR /app

# Non-root user for security
RUN addgroup -S athena && adduser -S athena -G athena

COPY --from=base /app/node_modules ./node_modules
COPY . .

# Ensure the non-root user can write the SQLite dev DB (if used in non-prod)
RUN chown -R athena:athena /app

USER athena
EXPOSE 3001

# Health check so container orchestrators can verify readiness
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "index.js"]
