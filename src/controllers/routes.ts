import { Router } from 'express';
import { PDFController } from './pdfController';
import { browserPool } from '../services/pdfService';

const router = Router();
const pdfController = new PDFController();

// Convert HTML to PDF
router.post('/convert', (req, res) => pdfController.convertToPDF(req, res));

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', ...browserPool.stats() });
});

export default router; 