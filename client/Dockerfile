FROM node:23-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_API_HOST
ARG VITE_API_PORT
RUN echo "VITE_API_HOST=${VITE_API_HOST:-localhost}" > .env
RUN echo "VITE_API_PORT=${VITE_API_PORT:-5006}" >> .env

RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
