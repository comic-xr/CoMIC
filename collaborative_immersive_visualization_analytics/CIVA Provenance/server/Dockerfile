FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including server deps)
RUN npm install --production=false

# Copy server code
COPY server ./server

# Expose API port
EXPOSE 3001

# Start the API server
CMD ["node", "server/src/index.js"]