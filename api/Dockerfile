FROM node:23-slim

WORKDIR /code
COPY package*.json ./
RUN npm install

COPY . .

CMD ["node", "src/index.js"]
