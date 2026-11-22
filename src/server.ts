import app from './app';
import { browserPool } from './services/pdfService';

const PORT = process.env.PORT || 3050;

const server = app.listen(PORT, () => {
  console.log(`🚀 HTML to PDF Microservice running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`API endpoint: http://localhost:${PORT}/api/convert`);
});

// Close Chromium cleanly when the container is stopped
const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down`);
  server.close();
  browserPool.shutdown().finally(() => process.exit(0));
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
