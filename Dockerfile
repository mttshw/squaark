# ── Build stage: full deps (needs tsc + node-gyp toolchain) ─────────────────
FROM node:20-alpine AS build

# better-sqlite3 requires native compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Drop devDependencies now that dist/ exists and better-sqlite3 is already
# compiled — avoids a second native build in the runtime stage.
RUN npm prune --omit=dev

# ── Runtime stage: no compiler toolchain, just the app ───────────────────────
FROM node:20-alpine

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY admin ./admin
COPY themes ./themes

EXPOSE 3000
CMD ["node", "dist/server.js"]
