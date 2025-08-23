import { Request, Response } from 'express';
import { PDFService, ConversionOptions } from '../services/pdfService';

export class PDFController {
  private pdfService: PDFService;

  constructor() {
    this.pdfService = new PDFService();
  }

  async convertToPDF(req: Request, res: Response): Promise<void> {
    try {
      const { url, html, filename = 'document.pdf', ...pdfOptions } = req.body;
      
      if (!url && !html) {
        res.status(400).json({ error: 'Either URL or HTML content must be provided' });
        return;
      }

      const options: ConversionOptions = {
        ...pdfOptions,
        url,
        html
      };

      const pdfBuffer = await this.pdfService.generateFromHTML(options);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error('PDF conversion error:', error);
      res.status(500).json({ 
        error: 'Failed to convert to PDF',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
} 