FROM node:22-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_MINIMUM_RELEASE_AGE=0

RUN corepack enable

# Install Python dan build tools untuk kompilasi dependency native (better-sqlite3)
RUN apk add --no-cache python3 py3-pip make gcc g++
# Link python3 ke python untuk node-gyp (force overwrite jika sudah ada)
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Semua COPY path relatif terhadap WORKDIR /app (root workspace)
# Build context HARUS dijalankan dari root workspace: docker build -f apps/web/Dockerfile .
# SALIN SEMUA FILE TERLEBIH DAHULU sebelum install dependencies
COPY . .

# Install dependencies dengan policy dinonaktifkan via inline config flag
RUN pnpm --config.minimumReleaseAge=0 install --no-frozen-lockfile --no-optional
# Copy only golden spine routes (non-Golden excluded from build to prevent errors)
COPY apps/web/app/(eos)/work/new ./apps/web/app/(eos)/work/new
COPY apps/web/app/(eos)/enter ./apps/web/app/(eos)/enter
COPY apps/web/app/(eos)/my-reality ./apps/web/app/(eos)/my-reality
COPY apps/web/app/(auth)/login ./apps/web/app/(auth)/login
COPY apps/web/app/api/health ./apps/web/app/api/health
COPY apps/web/app/api/work/create ./apps/web/app/api/work/create
COPY apps/web/app/api/capabilities/[cap]/[commandName] ./apps/web/app/api/capabilities/[cap]/[commandName]
COPY apps/web/app/api/governance/decisions ./apps/web/app/api/governance/decisions
# Build apps/web (FACE) sebagai container terpisah
WORKDIR /app/apps/web
RUN pnpm --config.minimumReleaseAge=0 next build

EXPOSE 3000

CMD ["pnpm", "start:standalone"]