# syntax=docker/dockerfile:1
FROM node:22-alpine

ENV NODE_ENV=production \
    DOTENV_CONFIG_QUIET=true

WORKDIR /app

COPY package.json package-lock.json server.js LICENSE ./
RUN npm ci --omit=dev && npm cache clean --force

COPY *.html ./public/
COPY src ./public/src

WORKDIR /app/public

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["node", "../server.js"]
