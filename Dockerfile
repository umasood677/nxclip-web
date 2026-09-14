# Vite SPA + Express (server.ts) → Cloud Run (Node 20).
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# VITE_* is inlined into the client bundle at build time.
ARG VITE_API_GATEWAY_URL
ARG VITE_API_GATEWAY_URL_PRODUCTION
ARG VITE_NOTIFICATION_WS_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_GATEWAY_URL=$VITE_API_GATEWAY_URL
ENV VITE_API_GATEWAY_URL_PRODUCTION=$VITE_API_GATEWAY_URL_PRODUCTION
ENV VITE_NOTIFICATION_WS_URL=$VITE_NOTIFICATION_WS_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV NODE_ENV=production

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
