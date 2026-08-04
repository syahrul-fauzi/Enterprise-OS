FROM node:20-alpine

WORKDIR /app

ENV CI=1
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY .npmrc ./
COPY apps ./apps
COPY capabilities ./capabilities
COPY config ./config
COPY contracts ./contracts
COPY foundation ./foundation
COPY packages ./packages
COPY products ./products
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=web...

EXPOSE 3000

CMD ["pnpm", "--filter", "web", "start", "--port", "3000", "--hostname", "0.0.0.0"]
