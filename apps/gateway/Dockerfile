# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/gateway/package.json apps/gateway/package.json
RUN npm ci
COPY apps/gateway apps/gateway
RUN npm run test --workspace=@bot/gateway && npm run build --workspace=@bot/gateway && npm prune --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/apps/gateway/package.json apps/gateway/package.json
COPY --from=build --chown=node:node /app/apps/gateway/dist apps/gateway/dist
COPY --from=build --chown=node:node /app/node_modules node_modules
USER node
CMD ["node", "apps/gateway/dist/main.js"]
