FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

RUN mkdir -p uploads && chown -R node:node /app

USER node
EXPOSE 5001

CMD ["node", "src/server.js"]
