FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -S -u 1001 -G appgroup appuser
COPY --from=build --chown=1001:1001 /app ./
USER 1001
ENV NODE_ENV=production
EXPOSE 9000
CMD ["node", "server.js"]
