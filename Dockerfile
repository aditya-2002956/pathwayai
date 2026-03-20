# ── Stage 1: Build ────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json ./
RUN npm install

# Copy source and build
COPY . .
ARG VITE_ANTHROPIC_API_KEY
ENV VITE_ANTHROPIC_API_KEY=$VITE_ANTHROPIC_API_KEY
RUN npm run build

# ── Stage 2: Serve ─────────────────────────────────────────
FROM node:18-alpine AS runner

WORKDIR /app

# Install a lightweight static server
RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173"]
