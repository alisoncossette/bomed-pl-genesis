# 🏗️ Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_WORLD_APP_ID
ARG NEXT_PUBLIC_WORLD_ACTION
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_BOLO_API_URL

ENV NEXT_PUBLIC_WORLD_APP_ID=$NEXT_PUBLIC_WORLD_APP_ID
ENV NEXT_PUBLIC_WORLD_ACTION=$NEXT_PUBLIC_WORLD_ACTION
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_BOLO_API_URL=$NEXT_PUBLIC_BOLO_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# 🚀 Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 8080

CMD ["node", "server.js"]
