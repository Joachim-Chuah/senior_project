# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Bake in build-time env vars
ARG VITE_DEMO_MODE=true
ARG VITE_LOGO_DEV_TOKEN
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE
ENV VITE_LOGO_DEV_TOKEN=$VITE_LOGO_DEV_TOKEN

RUN npm run build

# ── Serve stage ───────────────────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
