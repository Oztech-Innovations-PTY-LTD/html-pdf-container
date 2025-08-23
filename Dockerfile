FROM node:20-slim

# Add metadata labels
LABEL maintainer="HTML to PDF Microservice"
LABEL description="A Node.js microservice that converts HTML to PDF using Puppeteer"
LABEL version="1.0.0"

# Install dependencies for Puppeteer and headless Chromium
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    gnupg \
    ca-certificates \
    chromium \
    fonts-liberation \
    gconf-service \
    libappindicator1 \
    libasound2 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libfontconfig1 \
    libgbm-dev \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libicu-dev \
    libjpeg-dev \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libpng-dev \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    xdg-utils && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Create app directory
WORKDIR /usr/src/app

# Puppeteer/Chromium configuration for container environment
ENV PUPPETEER_CACHE_DIR=/tmp/puppeteer
ENV DISPLAY=:99
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV HOME=/home/appuser
ENV XDG_CONFIG_HOME=/home/appuser/.config
ENV XDG_CACHE_HOME=/home/appuser/.cache
ENV XDG_DATA_HOME=/home/appuser/.local/share
ENV CHROME_USER_DATA_DIR=/home/appuser/chrome-user-data
ENV CHROME_CACHE_DIR=/home/appuser/chrome-cache
ENV CHROME_CRASH_DIR=/home/appuser/chrome-crash

# Create non-root user and cache directory
RUN groupadd -r appuser && useradd -r -g appuser -d /home/appuser appuser && \
    mkdir -p /tmp/puppeteer \
             /home/appuser \
             /home/appuser/.config \
             /home/appuser/.cache \
             /home/appuser/.local/share \
             /home/appuser/chrome-user-data \
             /home/appuser/chrome-cache \
             /home/appuser/chrome-crash && \
    chown -R appuser:appuser /tmp/puppeteer /home/appuser

# Copy package files and install dependencies (including dev dependencies for build)
COPY package*.json ./
RUN npm install && npm cache clean --force

# Copy app source
COPY . .

# Build TypeScript
RUN npm run build

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3050

# # Remove dev dependencies and source files to reduce image size
# RUN rm -rf src/ node_modules/ && npm ci --only=production

USER appuser

# Expose port
EXPOSE 3050

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3050/api/health || exit 1

# Start the application
CMD ["node", "dist/server.js"] 