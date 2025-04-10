FROM node:23-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=${VITE_API_URL:-http://localhost:5006}
ENV VITE_WS_URL=${VITE_WS_URL:-ws://localhost:5006}

RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
