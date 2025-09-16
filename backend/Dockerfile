FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY --from=builder /app . 

EXPOSE 3001

CMD ["node", "src/server.js"]