FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock ./
COPY packages ./packages

RUN bun install --frozen-lockfile
RUN bun run --cwd packages/database db:generate
RUN bun run --cwd packages/server build

FROM oven/bun:1
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package.json ./
COPY --from=build /app/bun.lock ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages

CMD ["sh", "-c", "bun run --cwd packages/database db:push && bun --cwd packages/server dist/index.js"]