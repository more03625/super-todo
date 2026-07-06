FROM node:22-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# NEXT_PUBLIC_* vars are consumed at BUILD time by `next build` (baked into the
# JS bundle). Compose passes the environment-appropriate value as a build arg.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ENV PORT=3003
EXPOSE 3003

# ── dev: hot-reloading dev server, used by docker-compose.yml (local) ────────
FROM base AS dev
CMD ["npm", "run", "dev"]

# ── prod: compiled build, used by docker-compose.prod.yml ────────────────────
FROM base AS prod
ENV NODE_ENV=production
RUN npm run build
CMD ["npm", "run", "start"]
