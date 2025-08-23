import { Router } from 'express';
import { PDFController } from './pdfController';

const router = Router();
const pdfController = new PDFController();

// Convert HTML to PDF
router.post('/convert', (req, res) => pdfController.convertToPDF(req, res));

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default router; 