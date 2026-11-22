import puppeteer, { PDFOptions, Browser, Page } from 'puppeteer';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ConversionOptions extends PDFOptions {
  url?: string;
  html?: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
}

// Thrown when the wait queue is full, so the controller can answer 503 instead of 500
export class QueueFullError extends Error {
  constructor(limit: number) {
    super(`PDF queue is full (${limit} waiting), try again shortly`);
    this.name = 'QueueFullError';
  }
}

const intFromEnv = (name: string, fallback: number): number => {
  const value = parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

// How many PDFs render at the same time; the rest wait in a queue
const MAX_CONCURRENT = intFromEnv('PDF_MAX_CONCURRENT', 3);
// How many requests may wait before new ones are rejected with 503
const MAX_QUEUE = intFromEnv('PDF_MAX_QUEUE', 50);
// How long a request may wait in the queue before giving up
const QUEUE_TIMEOUT_MS = intFromEnv('PDF_QUEUE_TIMEOUT_MS', 25000);
// Restart Chromium after this many PDFs to stop memory building up
const MAX_JOBS_PER_BROWSER = intFromEnv('PDF_MAX_JOBS_PER_BROWSER', 200);

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--no-first-run',
  '--no-zygote'
];

// Matches the old per-request timeout for loading the page
const NAVIGATION_TIMEOUT_MS = 30000;

interface BrowserHandle {
  browser: Browser;
  userDataDir: string;
  jobs: number;
  active: number;
  retired: boolean;
}

/**
 * Keeps one Chromium running and reuses it for every conversion; each conversion gets its own tab.
 * (Separate browser contexts per request cost ~1s each and serialise, so tabs share the default one.)
 */
class BrowserPool {
  private current: BrowserHandle | null = null;
  private launching: Promise<BrowserHandle> | null = null;
  private running = 0;
  private waiting: Array<{ resolve: () => void; reject: (err: Error) => void; timer: NodeJS.Timeout }> = [];

  async run<T>(job: (page: Page) => Promise<T>): Promise<T> {
    await this.acquireSlot();
    let handle: BrowserHandle | null = null;
    let page: Page | null = null;
    try {
      handle = await this.getBrowser();
      handle.active++;
      handle.jobs++;
      if (handle.jobs >= MAX_JOBS_PER_BROWSER) {
        // Newer requests get a fresh browser; this one closes once its in-flight jobs finish
        this.retire(handle);
      }
      page = await handle.browser.newPage();
      return await job(page);
    } finally {
      if (page) {
        await page.close().catch(err => console.error('Failed to close page:', err));
      }
      if (handle) {
        handle.active--;
        if (handle.retired && handle.active === 0) {
          await this.closeHandle(handle);
        }
      }
      this.releaseSlot();
    }
  }

  stats() {
    return {
      browserRunning: !!this.current && this.current.browser.connected,
      browserJobs: this.current ? this.current.jobs : 0,
      running: this.running,
      waiting: this.waiting.length,
      maxConcurrent: MAX_CONCURRENT,
      maxQueue: MAX_QUEUE
    };
  }

  async shutdown(): Promise<void> {
    if (this.current) {
      await this.closeHandle(this.current);
      this.current = null;
    }
  }

  private acquireSlot(): Promise<void> {
    if (this.running < MAX_CONCURRENT) {
      this.running++;
      return Promise.resolve();
    }
    if (this.waiting.length >= MAX_QUEUE) {
      return Promise.reject(new QueueFullError(MAX_QUEUE));
    }
    return new Promise((resolve, reject) => {
      const entry = {
        resolve,
        reject,
        timer: setTimeout(() => {
          this.waiting = this.waiting.filter(w => w !== entry);
          reject(new Error(`Timed out after ${QUEUE_TIMEOUT_MS}ms waiting in the PDF queue`));
        }, QUEUE_TIMEOUT_MS)
      };
      this.waiting.push(entry);
    });
  }

  private releaseSlot(): void {
    const next = this.waiting.shift();
    if (next) {
      // Hand the slot straight to the next waiter; the running count stays the same
      clearTimeout(next.timer);
      next.resolve();
    } else {
      this.running--;
    }
  }

  private async getBrowser(): Promise<BrowserHandle> {
    if (this.current && !this.current.retired && this.current.browser.connected) {
      return this.current;
    }
    // Share one launch between requests that arrive while Chromium is starting
    if (!this.launching) {
      this.launching = this.launch().finally(() => {
        this.launching = null;
      });
    }
    return this.launching;
  }

  private async launch(): Promise<BrowserHandle> {
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'puppeteer-user-data-'));
    const started = Date.now();
    try {
      const browser = await puppeteer.launch({
        headless: true,
        timeout: 30000,
        executablePath,
        userDataDir,
        args: LAUNCH_ARGS
      });
      const handle: BrowserHandle = { browser, userDataDir, jobs: 0, active: 0, retired: false };
      browser.on('disconnected', () => {
        // Chromium crashed or was closed: drop it so the next request launches a new one
        if (this.current === handle) {
          console.warn('Chromium disconnected, a new one will be launched on the next request');
          this.current = null;
        }
        handle.retired = true;
        fs.rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
      });
      this.current = handle;
      console.log(`Chromium launched in ${Date.now() - started}ms`);
      return handle;
    } catch (err) {
      await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
      throw err;
    }
  }

  private retire(handle: BrowserHandle): void {
    handle.retired = true;
    if (this.current === handle) {
      this.current = null;
    }
  }

  private async closeHandle(handle: BrowserHandle): Promise<void> {
    handle.retired = true;
    try {
      await handle.browser.close();
    } catch (err) {
      console.error('Failed to close Chromium:', err);
    }
    await fs.rm(handle.userDataDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export const browserPool = new BrowserPool();

/**
 * Load the page and wait like Puppeteer's waitUntil option. networkidle0/2 are done by waiting for
 * 'load' and then for the network to be idle for 500ms, tracked by Puppeteer: Chromium's own
 * networkIdle event never fires for some tabs when several render at once in one browser.
 */
async function loadPage(page: Page, options: ConversionOptions): Promise<void> {
  const waitUntil = options.waitUntil || 'networkidle0';
  const idleConcurrency = waitUntil === 'networkidle0' ? 0 : waitUntil === 'networkidle2' ? 2 : -1;
  const navWaitUntil = idleConcurrency >= 0 ? 'load' : waitUntil;
  const started = Date.now();

  if (options.url) {
    await page.goto(options.url, { waitUntil: navWaitUntil, timeout: NAVIGATION_TIMEOUT_MS });
  } else {
    await page.setContent(options.html as string, { waitUntil: navWaitUntil, timeout: NAVIGATION_TIMEOUT_MS });
  }

  if (idleConcurrency >= 0) {
    const remaining = Math.max(1000, NAVIGATION_TIMEOUT_MS - (Date.now() - started));
    await page.waitForNetworkIdle({ idleTime: 500, concurrency: idleConcurrency, timeout: remaining });
  }
}

export class PDFService {
  async generateFromHTML(options: ConversionOptions): Promise<Buffer> {
    if (!options.url && !options.html) {
      throw new Error('Either URL or HTML content must be provided');
    }

    return browserPool.run(async page => {
      await loadPage(page, options);

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

      return page.pdf(pdfOptions);
    });
  }
}
