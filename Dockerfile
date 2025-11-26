# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

FROM node:20-bookworm-slim AS server
WORKDIR /app/server
ENV NODE_ENV=production
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ .
COPY --from=client-builder /app/client/dist ./public
RUN mkdir -p data uploads/reports && chown -R node:node /app/server
USER node
EXPOSE 3000
CMD ["node", "index.mjs"]

