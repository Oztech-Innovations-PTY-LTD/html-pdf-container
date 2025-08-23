import puppeteer, { PDFOptions, Browser } from 'puppeteer';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ConversionOptions extends PDFOptions {
  url?: string;
  html?: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
}

export class PDFService {
  async generateFromHTML(options: ConversionOptions): Promise<Buffer> {
    // Use bundled Chromium for better container compatibility
    console.log('Using Puppeteer bundled Chromium for container environment');

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';

    // Create a unique temporary user data directory per conversion to avoid SingletonLock
    const tempUserDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'puppeteer-user-data-'));

    const launchOptions: any = {
      headless: true,
      timeout: 30000,
      executablePath,
      userDataDir: tempUserDataDir,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-zygote'
      ]
    };

    let browser: Browser | null = null;
    try {
      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();

      if (options.url) {
        await page.goto(options.url, {
          waitUntil: options.waitUntil || 'networkidle0'
        });
      } else if (options.html) {
        await page.setContent(options.html, {
          waitUntil: options.waitUntil || 'networkidle0'
        });
      } else {
        throw new Error('Either URL or HTML content must be provided');
      }

      // Default PDF options
      const pdfOptions: PDFOptions = {
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        },
        ...options
      };

      // Remove non-PDF options
      delete (pdfOptions as any).url;
      delete (pdfOptions as any).html;
      delete (pdfOptions as any).waitUntil;

      const pdfBuffer = await page.pdf(pdfOptions);
      return pdfBuffer;
    } finally {
      if (browser) {
        await browser.close();
      }
      // Clean up the temporary user data directory
      await fs.rm(tempUserDataDir, { recursive: true, force: true });
    }
  }
} 