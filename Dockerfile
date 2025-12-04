FROM node:18-slim

# Install build tools required by sqlite3 native build
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 build-essential ca-certificates git curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests first for better caching
COPY package*.json ./

# Install dependencies (including sqlite3)
RUN npm install --production

# Copy the rest of the app
COPY . /app

# Ensure data dir exists
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
