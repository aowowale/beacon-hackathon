# syntax=docker/dockerfile:1
# Combined image: builds the Vite/React front-end and the Fastify API,
# then serves the SPA from the API as a single hosted origin.

# --- Stage 1: build the web front-end ---
FROM node:22-alpine AS web
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
# Optional Production-mode sign-in config, baked in at build time by Vite.
# Leave empty to ship with Production mode showing a graceful "needs configuration" state.
ARG VITE_AAD_CLIENT_ID=""
ARG VITE_AAD_TENANT_ID=""
ARG VITE_AAD_REDIRECT_URI=""
ENV VITE_AAD_CLIENT_ID=$VITE_AAD_CLIENT_ID
ENV VITE_AAD_TENANT_ID=$VITE_AAD_TENANT_ID
ENV VITE_AAD_REDIRECT_URI=$VITE_AAD_REDIRECT_URI
RUN npm run build

# --- Stage 2: build the API ---
FROM node:22-alpine AS api-build
WORKDIR /app
COPY production/api/package.json ./
RUN npm install --no-audit --no-fund
COPY production/api/tsconfig.json production/api/tsconfig.build.json production/api/vitest.config.ts ./
COPY production/api/src ./src
RUN npm run build

# --- Stage 3: API production dependencies only ---
FROM node:22-alpine AS api-deps
WORKDIR /app
COPY production/api/package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# --- Stage 4: runtime ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=api-deps /app/node_modules ./node_modules
COPY --from=api-build /app/dist ./dist
COPY production/api/package.json ./
COPY --from=web /web/dist ./public
USER node
EXPOSE 8080
CMD ["node", "dist/server.js"]
