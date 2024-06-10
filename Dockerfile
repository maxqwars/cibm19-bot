FROM node:20.13

WORKDIR /app
COPY package.json package-lock.json ./
COPY . ./

RUN npm install
RUN npx prisma generate
RUN npx rollup -c rollup.config.js