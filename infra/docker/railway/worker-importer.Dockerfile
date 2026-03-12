FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json tsconfig.json tsconfig.monorepo.json ./
COPY apps ./apps
COPY workers ./workers
COPY packages ./packages

RUN npm ci --include=dev

ENV NODE_ENV=production
ENV WORKER_NAME=worker
ENV WORKER_JOB_TYPES=all

CMD ["npm", "run", "serve:worker"]
