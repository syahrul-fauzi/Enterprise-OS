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
# Build only golden spine routes (work/new + required APIs - core freeze compliant)
# Hapus non-golden package build untuk menghindari dependency error (evidence-registry, workflow-engine, requirement-management)
WORKDIR /app/apps/web
RUN pnpm next build

EXPOSE 3000

CMD ["node", ".next/standalone/server.js"]