# syntax=docker/dockerfile:1
# Fly.io build for the Maritime Ops backend.
# This Dockerfile lives at the repo root so Fly's build context (repo root)
# can reach backend/. It builds the same image as backend/Dockerfile.

FROM node:20-alpine AS build
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
EXPOSE 4000
CMD ["node", "dist/index.js"]
