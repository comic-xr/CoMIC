# Thumbnail Worker Dockerfile
# Uses Playwright with Chromium for headless browser rendering

FROM node:20-slim

# Install dependencies for Playwright/Chromium
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user FIRST
RUN useradd -m worker

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Set Playwright to use a shared cache directory
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers

# Install Playwright browsers to shared location (as root, but accessible to all)
RUN npx playwright install chromium \
    && chmod -R 755 /opt/playwright-browsers

# Copy worker code
COPY worker.js ./

# Change ownership of app directory
RUN chown -R worker:worker /app

# Run as non-root user for security
USER worker

CMD ["node", "worker.js"]