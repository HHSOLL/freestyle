FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json tsconfig.json tsconfig.monorepo.json ./
COPY apps ./apps
COPY workers ./workers
COPY packages ./packages

RUN npm ci --include=dev

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

CMD ["npm", "run", "serve:api"]
