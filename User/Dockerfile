FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

FROM node:20-alpine
# Patch OS packages and drop npm/corepack from the runtime image: the app only
# runs `node server.js`, and npm's bundled deps are a large CVE surface.
RUN apk upgrade --no-cache \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
WORKDIR /app
RUN addgroup -g 1001 -S appgroup && adduser -S -u 1001 -G appgroup appuser
COPY --from=build --chown=1001:1001 /app ./
USER 1001
ENV NODE_ENV=production
EXPOSE 9001
CMD ["node", "server.js"]
