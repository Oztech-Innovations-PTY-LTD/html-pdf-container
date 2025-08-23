import puppeteer, { PDFOptions } from 'puppeteer';
import { execSync } from 'child_process';
import * as os from 'os';

export interface ConversionOptions extends PDFOptions {
  url?: string;
  html?: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
}

export class PDFService {
  private async getChromePath(): Promise<string | undefined> {
    const platform = os.platform();

    // Windows Chrome paths
    if (platform === 'win32') {
      const windowsPaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
        process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
        process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe'
      ];

      for (const path of windowsPaths) {
        try {
          if (path && require('fs').existsSync(path)) {
            return path;
          }
        } catch (e) {
          continue;
        }
      }
    }

    // MacOS Chrome paths
    if (platform === 'darwin') {
      const macPaths = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium'
      ];

      for (const path of macPaths) {
        try {
          execSync(`test -f "${path}"`);
          return path;
        } catch (e) {
          continue;
        }
      }
    }

    // Linux Chrome paths
    if (platform === 'linux') {
      const linuxPaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium'
      ];

      for (const path of linuxPaths) {
        try {
          execSync(`test -f "${path}"`);
          return path;
        } catch (e) {
          continue;
        }
      }
    }

    // Try to find Chrome using system commands
    try {
      if (platform === 'win32') {
        // Windows: try to find Chrome using where command
        const chromePath = execSync('where chrome', { encoding: 'utf8' }).trim().split('\n')[0];
        if (chromePath) return chromePath;
      } else {
        // Unix-like: try to find Chrome using which command
        const chromePath = execSync('which google-chrome', { encoding: 'utf8' }).trim();
        if (chromePath) return chromePath;
      }
    } catch (e) {
      // Ignore errors from system commands
    }

    // Return undefined if no system Chrome found - puppeteer will use bundled Chromium
    return undefined;
  }

  async generateFromHTML(options: ConversionOptions): Promise<Buffer> {
    // Use bundled Chromium for better container compatibility
    console.log('Using Puppeteer bundled Chromium for container environment');

    const launchOptions: any = {
      headless: 'new',
      timeout: 30000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-crash-reporter',
        '--disable-crashpad',
        '--disable-breakpad',
        '--disable-in-process-stack-traces',
        '--disable-logging',
        '--log-level=3',
        '--silent',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-ipc-flooding-protection',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--safebrowsing-disable-auto-update',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--ignore-certificate-errors-spki-list',
        '--ignore-ssl-errors-list',
        '--disable-component-extensions-with-background-pages',
        '--disable-hang-monitor',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--enable-automation',
        '--password-store=basic',
        '--use-mock-keychain'
      ]
    };

    // Don't specify executablePath to use bundled Chromium
    // This is more reliable in container environments

    const browser = await puppeteer.launch(launchOptions);

    try {
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
      await browser.close();
    }
  }
} 