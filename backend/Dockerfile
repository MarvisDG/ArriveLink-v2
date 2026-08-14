# syntax=docker/dockerfile:1

# ── base ───────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=development
COPY package.json package-lock.json* ./

# ── development ────────────────────────────────────────────────────────────────
# Source is bind-mounted by compose; tsx watch reloads on change.
FROM base AS development
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# ── build ──────────────────────────────────────────────────────────────────────
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# ── production ─────────────────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Drop root before running.
USER node
EXPOSE 5000
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
