# Deployment Guide

This guide covers deploying the HTML to PDF microservice using the container image.

## Quick Deployment

### 1. Pull and Run

```bash
# Pull the latest image
docker pull ghcr.io/[your-username]/html-pdf-container:latest

# Run the container
docker run -d \
  --name html-to-pdf \
  -p 3050:3050 \
  --restart unless-stopped \
  ghcr.io/[your-username]/html-pdf-container:latest
```

### 2. Verify Deployment

```bash
# Check container status
docker ps

# Test health endpoint
curl http://localhost:3050/api/health

# Check logs
docker logs html-to-pdf
```

## Production Deployment

### Using Docker Compose

```bash
# Create environment file
cat > .env << EOF
GITHUB_REPOSITORY=your-username/html-pdf-container
EOF

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

### Using Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: html-to-pdf
spec:
  replicas: 2
  selector:
    matchLabels:
      app: html-to-pdf
  template:
    metadata:
      labels:
        app: html-to-pdf
    spec:
      containers:
        - name: html-to-pdf
          image: ghcr.io/your-username/html-pdf-container:latest
                     ports:
             - containerPort: 3050
           env:
             - name: NODE_ENV
               value: "production"
             - name: PORT
               value: "3050"
          resources:
            limits:
              memory: "1Gi"
              cpu: "1000m"
            requests:
              memory: "512Mi"
              cpu: "500m"
                     livenessProbe:
             httpGet:
               path: /api/health
               port: 3050
             initialDelaySeconds: 30
             periodSeconds: 10
           readinessProbe:
             httpGet:
               path: /api/health
               port: 3050
             initialDelaySeconds: 5
             periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: html-to-pdf-service
spec:
  selector:
    app: html-to-pdf
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

## Environment Variables

| Variable   | Default    | Description      |
| ---------- | ---------- | ---------------- |
| `PORT`     | 3000       | Server port      |
| `NODE_ENV` | production | Environment mode |

## Health Monitoring

The container includes built-in health checks:

```bash
# Check container health
docker inspect html-to-pdf | grep Health -A 10

# Manual health check
curl -f http://localhost:3050/api/health
```

## Scaling

### Horizontal Scaling

```bash
# Scale to multiple instances
docker-compose -f docker-compose.prod.yml up -d --scale html-to-pdf=3
```

### Load Balancing

Use a reverse proxy like Nginx or Traefik:

```nginx
upstream html_to_pdf {
    server 127.0.0.1:3050;
    server 127.0.0.1:3051;
    server 127.0.0.1:3052;
}

server {
    listen 80;
    location / {
        proxy_pass http://html_to_pdf;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Security Considerations

- Container runs as non-root user
- Expose only necessary ports
- Use secrets management for sensitive data
- Regular security updates
- Network policies in Kubernetes

## Troubleshooting

### Common Issues

1. **Container won't start**

   ```bash
   docker logs html-to-pdf
   docker inspect html-to-pdf
   ```

2. **Health check failures**

   ```bash
   # Check if Puppeteer dependencies are working
   docker exec -it html-to-pdf node -e "console.log('Node.js working')"
   ```

3. **Memory issues**
   ```bash
   # Monitor resource usage
   docker stats html-to-pdf
   ```

### Performance Tuning

- Adjust memory limits based on PDF complexity
- Use volume mounts for persistent storage
- Enable Docker layer caching
- Monitor Puppeteer memory usage

## Backup and Recovery

```bash
# Backup container data
docker commit html-to-pdf html-to-pdf-backup

# Restore from backup
docker run -d --name html-to-pdf-restored \
  -p 3050:3050 \
  html-to-pdf-backup
```

## Updates

```bash
# Pull latest image
docker pull ghcr.io/[your-username]/html-pdf-container:latest

# Stop current container
docker stop html-to-pdf

# Remove old container
docker rm html-to-pdf

# Start new container
docker run -d \
  --name html-to-pdf \
  -p 3050:3050 \
  --restart unless-stopped \
  ghcr.io/[your-username]/html-pdf-container:latest
```
