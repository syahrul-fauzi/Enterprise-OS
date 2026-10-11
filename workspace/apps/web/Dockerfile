FROM node:22-alpine

WORKDIR /app

ENV CI=1
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
# Copy root configs required for build
COPY apps/web/next.config.js ./apps/web/next.config.js
COPY apps/web/tsconfig.json ./apps/web/tsconfig.json

# Install dependencies FIRST before copying source code (fixes cache invalidation issue)
RUN pnpm install --frozen-lockfile

# Now copy all source code (apps + packages) after dependencies are installed
COPY apps ./apps
COPY packages/presentation/config ./packages/presentation/config
COPY packages/presentation/entities ./packages/presentation/entities
COPY packages/presentation/ui-system ./packages/presentation/ui-system
COPY packages/presentation/foundation ./packages/presentation/foundation
COPY packages/presentation/experience ./packages/presentation/experience
COPY packages/presentation/hooks ./packages/presentation/hooks
COPY packages/presentation/templates ./packages/presentation/templates
COPY packages/presentation/widgets ./packages/presentation/widgets
COPY packages/presentation/features ./packages/presentation/features
COPY packages/core ./packages/core
COPY packages/composition ./packages/composition
COPY capabilities ./capabilities
COPY config ./config
# Copy only golden spine routes (non-Golden excluded from build to prevent errors)
COPY apps/web/app/(eos)/work/new ./apps/web/app/(eos)/work/new
COPY apps/web/app/(eos)/enter ./apps/web/app/(eos)/enter
COPY apps/web/app/(eos)/my-reality ./apps/web/app/(eos)/my-reality
COPY apps/web/app/(auth)/login ./apps/web/app/(auth)/login
COPY apps/web/app/api/health ./apps/web/app/api/health
COPY apps/web/app/api/work/create ./apps/web/app/api/work/create
COPY apps/web/app/api/capabilities/[cap]/[commandName] ./apps/web/app/api/capabilities/[cap]/[commandName]
COPY apps/web/app/api/governance/decisions ./apps/web/app/api/governance/decisions
# Build ONLY golden spine workspace packages first to generate dist files (required for golden spine imports)
# No non-Golden-Spine packages included - strictly follow dependency closure rule
# Add composition package which is required by @repo/presentation-ui-system (discovered via build error)
# Package path: ./packages/composition (exists in workspace, name listed in its own package.json as @repo/composition)
RUN pnpm build --filter @repo/composition
# Add presentation-hooks package required by @repo/presentation-ui-system (discovered via build error)
# Package path: ./packages/presentation/hooks (exists in workspace, name listed in its own package.json as @repo/presentation-hooks)
RUN pnpm build --filter @repo/presentation-hooks
# Build verified workspace packages:
RUN pnpm build --filter @repo/core-kernel --filter @capabilities/work-core --filter @repo/presentation-ui-system
# Build apps/api terlebih dahulu (Core Fabric)
WORKDIR /app/apps/api
RUN pnpm next build
# Build apps/web (FACE) setelah core siap
WORKDIR /app/apps/web
RUN pnpm next build

# Install pm2 untuk menjalankan kedua server dalam satu container
RUN npm install -g pm2
# Buat ecosystem.config.js untuk pm2
RUN echo "module.exports = {apps: [{name: 'eos-api', script: '/app/apps/api/.next/standalone/server.js', instances: 1, exec_mode: 'fork', env: {PORT: 3001}}, {name: 'eos-web', script: '/app/apps/web/.next/standalone/server.js', instances: 1, exec_mode: 'fork', env: {PORT: 3000, NEXT_PUBLIC_API_URL: 'http://localhost:3001'}}]};" > /app/ecosystem.config.js

EXPOSE 3000

CMD ["pm2-runtime", "start", "/app/ecosystem.config.js"]