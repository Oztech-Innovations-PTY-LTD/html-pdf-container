import app from './app';

const PORT = process.env.PORT || 3050;

app.listen(PORT, () => {
  console.log(`🚀 HTML to PDF Microservice running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`API endpoint: http://localhost:${PORT}/api/convert`);
});
