FROM node:20-slim

# Add metadata labels
LABEL maintainer="HTML to PDF Microservice"
LABEL description="A Node.js microservice that converts HTML to PDF using Puppeteer"
LABEL version="1.0.0"

# Install dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
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
    xdg-utils \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create app directory
WORKDIR /usr/src/app

# Set cache directory for Puppeteer
ENV PUPPETEER_CACHE_DIR=/tmp/puppeteer

# Create non-root user and cache directory
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN mkdir -p /tmp/puppeteer && chown -R appuser:appuser /tmp/puppeteer

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