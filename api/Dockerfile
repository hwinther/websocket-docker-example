FROM node:23-slim

WORKDIR /code

# Install wait-for-it script dependencies
RUN apt-get update && apt-get install -y wget

# Download wait-for-it script
RUN wget -O /wait-for-it.sh https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh \
    && chmod +x /wait-for-it.sh

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

# Wait for PostgreSQL to be ready before starting the application
CMD ["/bin/bash", "-c", "/wait-for-it.sh postgres:5432 -t 10 -- node src/index.js"]
