FROM node:20-slim

WORKDIR /code

COPY package*.json ./

RUN npm install

COPY . .

CMD ["node", "src/index.js"]
