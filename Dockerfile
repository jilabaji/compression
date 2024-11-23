FROM node:23-alpine3.19

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]