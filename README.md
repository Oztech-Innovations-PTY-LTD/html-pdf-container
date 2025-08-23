# HTML to PDF Microservice

A Node.js microservice that converts HTML to PDF, built with TypeScript, Express, and Puppeteer.

## Features

- Convert HTML content to PDF
- Convert web pages to PDF by URL
- Customize PDF output (format, margins, etc.)
- RESTful API
- Docker support with optimized container image
- GitHub Actions CI/CD pipeline

## Quick Start with Container

### Using GitHub Container Registry

The latest container image is available at: `ghcr.io/[your-username]/html-pdf-container`

```bash
# Pull the latest image
docker pull ghcr.io/[your-username]/html-pdf-container:latest

# Run the container
docker run -p 3050:3050 ghcr.io/[your-username]/html-pdf-container:latest
```

### Using Docker Hub (if you prefer)

```bash
# Build the Docker image
docker build -t html-to-pdf-microservice .

# Run the container
docker run -p 3050:3050 html-to-pdf-microservice
```

### Docker Compose

```bash
# Development mode with hot reloading
docker-compose up

# Production mode
docker-compose -f docker-compose.prod.yml up
```

## Installation

```bash
# Clone the repository
git clone https://github.com/terraseraph/html-pdf-container.git
cd html-pdf-container

# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

## Development

```bash
# Run in development mode with hot reloading
npm run dev
```

## API Usage

### Convert HTML to PDF

**Endpoint:** `POST /api/convert`

**Request Body:**

```json
{
	"html": "<html><body><h1>Hello World</h1></body></html>",
	"filename": "output.pdf",
	"format": "A4",
	"landscape": false,
	"printBackground": true,
	"margin": {
		"top": "1cm",
		"right": "1cm",
		"bottom": "1cm",
		"left": "1cm"
	}
}
```

Or using a URL:

```json
{
	"url": "https://example.com",
	"filename": "output.pdf",
	"format": "A4"
}
```

**Response:** PDF file as a download

### Health Check

**Endpoint:** `GET /api/health`

**Response:** JSON status indicating service health

## Container Features

- **Multi-stage build** for optimized image size
- **Security**: Runs as non-root user
- **Health checks** for container orchestration
- **Caching**: Optimized layer caching for faster builds
- **Metadata**: Proper labels and documentation

## GitHub Actions

This repository includes a GitHub Actions workflow that automatically:

- Builds the Docker image on every push to main/master
- Publishes to GitHub Container Registry (ghcr.io)
- Creates tags for releases and branches
- Enables caching for faster builds

### Workflow Triggers

- **Push to main/master**: Builds and publishes latest image
- **Pull requests**: Builds image for testing (no publish)
- **Tags (v\*):** Creates versioned releases

### Container Registry

Images are published to: `ghcr.io/[your-username]/html-pdf-container`

Available tags:

- `latest` - Latest commit on main branch
- `main` - Latest commit on main branch
- `v1.0.0` - Semantic version tags
- `main-abc123` - Branch with commit SHA

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (default: production)

## Security Considerations

- Container runs as non-root user
- Minimal attack surface with slim base image
- Regular security updates via base image updates
- Health checks for monitoring

## Troubleshooting

### Container Issues

```bash
# Check container logs
docker logs <container-id>

# Check container health
docker inspect <container-id> | grep Health -A 10

# Access container shell
docker exec -it <container-id> /bin/bash
```

### Build Issues

```bash
# Clean build cache
docker builder prune

# Force rebuild without cache
docker build --no-cache -t html-to-pdf-microservice .
```
