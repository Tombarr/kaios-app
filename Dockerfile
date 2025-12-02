FROM node:lts-alpine

# Install build dependencies for better-sqlite3
RUN apk add --no-cache make g++

WORKDIR /app

# Copy data dependencies
COPY data/package*.json ./data/
RUN cd data && npm ci && cd ..

# Copy src dependencies
COPY src/package*.json ./src/
RUN cd src && npm ci && cd ..

# Copy source code
COPY data ./data
COPY src ./src
COPY docker-entrypoint.sh /usr/local/bin/

# Make entrypoint executable
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
