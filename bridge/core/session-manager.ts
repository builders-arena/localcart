import { chromium, type BrowserContext, type Page } from 'playwright';
import pino from 'pino';
import type {
  ActionCommand,
  BridgeResponse,
  BridgeState,
  LocalCartConfig,
  PageState,
} from '../types/index.js';
import { extractPageState, redactPIIContainers } from './dom-sanitizer.js';
import { humanClick, humanType, humanScroll, humanDelay, sleep, waitForPageStable } from './human-like.js';
import { RateLimiter } from './rate-limiter.js';
import { HITLGate } from './hitl-gate.js';

const log = pino({ name: 'session-manager' });

export class SessionManager {
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private state: BridgeState = 'idle';
  private config: LocalCartConfig;
  private rateLimiter: RateLimiter;
  readonly hitlGate: HITLGate;

  constructor(config: LocalCartConfig) {
    this.config = config;
    this.rateLimiter = new RateLimiter(config.rateLimits);
    this.hitlGate = new HITLGate();
  }

  async launch(): Promise<void> {
    log.info({ userDataDir: this.config.userDataDir }, 'Launching persistent browser context');

    this.context = await chromium.launchPersistentContext(this.config.userDataDir, {
      headless: this.config.headless,
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
      timezoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    // Remove the automation indicator that Playwright injects
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    this.page = this.context.pages()[0] || await this.context.newPage();
    this.state = 'idle';

    // Watch for new pages (popups) and close them to keep a single-page model
    this.context.on('page', async (newPage) => {
      log.warn('Popup detected — closing to maintain single-page session');
      await newPage.close();
    });

    log.info('Browser context ready');
  }

  async shutdown(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.page = null;
      this.state = 'idle';
    }
  }

  async navigateAndExtract(url: string): Promise<PageState> {
    this.ensurePage();

    if (!this.isDomainAllowed(url)) {
      throw new Error(`Domain not in allowlist: ${new URL(url).hostname}`);
    }

    this.state = 'navigating';
    await this.page!.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await waitForPageStable(this.page!);

    this.state = 'extracting';
    await redactPIIContainers(this.page!);
    const pageState = await extractPageState(this.page!);

    this.state = 'page_ready';
    return pageState;
  }

  async executeAction(command: ActionCommand): Promise<BridgeResponse> {
    this.ensurePage();

    // 1. Rate limit check (enforced, not advisory)
    const rateCheck = this.rateLimiter.check(command);
    if (!rateCheck.allowed) {
      log.warn({ action: command.action, reason: rateCheck.reason }, 'Rate limited');
      return {
        status: 'rate_limited',
        error: rateCheck.reason,
        retryAfterMs: rateCheck.retryAfterMs,
      };
    }

    // 2. HITL gate check (blocks on 'gate' tier actions)
    const approval = await this.hitlGate.checkAction(
      command,
      await extractPageState(this.page!)
    );
    if (!approval.approved) {
      return {
        status: 'pending_approval',
        error: approval.reason || 'Action requires human approval',
        requires: 'approval',
      };
    }

    // 3. Execute
    this.state = 'executing_action';
    try {
      const result = await this.dispatch(command);
      this.rateLimiter.record(command);
      return result;
    } catch (err) {
      this.state = 'error_recovery';
      const message = err instanceof Error ? err.message : String(err);
      log.error({ action: command.action, error: message }, 'Action failed');

      // Check if the error is a CAPTCHA/interstitial
      const interstitial = await this.checkForInterstitial();
      if (interstitial) {
        return interstitial;
      }

      return { status: 'error', error: message };
    }
  }

  private async dispatch(command: ActionCommand): Promise<BridgeResponse> {
    const page = this.page!;

    switch (command.action) {
      case 'search': {
        await page.goto(`https://www.amazon.com/s?k=${encodeURIComponent(command.query)}`, {
          waitUntil: 'domcontentloaded',
        });
        await waitForPageStable(page);
        await sleep(humanDelay(1500));
        return this.extractAndRespond();
      }

      case 'view_product': {
        await page.goto(`https://www.amazon.com/dp/${command.asin}`, {
          waitUntil: 'domcontentloaded',
        });
        await waitForPageStable(page);
        await sleep(humanDelay(2000));
        return this.extractAndRespond();
      }

      case 'add_to_cart': {
        // Ensure we're on the product page
        if (!page.url().includes(`/dp/${command.asin}`)) {
          await page.goto(`https://www.amazon.com/dp/${command.asin}`, {
            waitUntil: 'domcontentloaded',
          });
          await waitForPageStable(page);
          await sleep(humanDelay(1800));
        }

        await humanClick(page, '#add-to-cart-button');
        await waitForPageStable(page);
        await sleep(humanDelay(1200));

        // Check for "Added to Cart" confirmation or side-sheet
        const addedConfirm = await page.$('#NATC_SMART_WAGON_CONF_MSG_SUCCESS, #huc-v2-order-row-confirm-text');
        if (addedConfirm) {
          log.info({ asin: command.asin }, 'Item added to cart');
        }

        return this.extractAndRespond();
      }

      case 'view_cart': {
        await page.goto('https://www.amazon.com/gp/cart/view.html', {
          waitUntil: 'domcontentloaded',
        });
        await waitForPageStable(page);
        await sleep(humanDelay(1500));
        return this.extractAndRespond();
      }

      case 'remove_from_cart': {
        if (!page.url().includes('/cart')) {
          await page.goto('https://www.amazon.com/gp/cart/view.html', {
            waitUntil: 'domcontentloaded',
          });
          await waitForPageStable(page);
        }
        const deleteInput = await page.$(`[data-asin="${command.asin}"] input[name*="delete"], [value="Delete"][data-action*="${command.asin}"]`);
        if (deleteInput) {
          await humanClick(page, `[data-asin="${command.asin}"] input[name*="delete"]`);
          await waitForPageStable(page);
        }
        return this.extractAndRespond();
      }

      case 'update_quantity': {
        if (!page.url().includes('/cart')) {
          await page.goto('https://www.amazon.com/gp/cart/view.html', {
            waitUntil: 'domcontentloaded',
          });
          await waitForPageStable(page);
        }
        const qtySelector = `[data-asin="${command.asin}"] select[name*="quantity"]`;
        const qtyDropdown = await page.$(qtySelector);
        if (qtyDropdown) {
          await page.selectOption(qtySelector, String(command.quantity));
          await waitForPageStable(page);
        }
        return this.extractAndRespond();
      }

      case 'proceed_to_checkout': {
        await humanClick(page, '#sc-buy-box-ptc-button input, [name="proceedToRetailCheckout"]');
        await waitForPageStable(page);
        await sleep(humanDelay(2500));
        return this.extractAndRespond();
      }

      case 'place_order': {
        await humanClick(page, '#submitOrderButtonId input, [name="placeYourOrder1"]');
        await waitForPageStable(page);
        await sleep(humanDelay(3000));
        return this.extractAndRespond();
      }

      case 'scroll': {
        await humanScroll(page, command.direction, command.amount);
        await sleep(humanDelay(800));
        return this.extractAndRespond();
      }

      case 'navigate': {
        if (!this.isDomainAllowed(command.url)) {
          return { status: 'error', error: `Domain not in allowlist: ${new URL(command.url).hostname}` };
        }
        await page.goto(command.url, { waitUntil: 'domcontentloaded' });
        await waitForPageStable(page);
        await sleep(humanDelay(1500));
        return this.extractAndRespond();
      }

      case 'get_page_state': {
        return this.extractAndRespond();
      }

      default:
        return { status: 'error', error: `Unknown action: ${(command as ActionCommand).action}` };
    }
  }

  private async extractAndRespond(): Promise<BridgeResponse> {
    await redactPIIContainers(this.page!);
    const pageState = await extractPageState(this.page!);

    // Check for interstitials after every extraction
    if (pageState.interstitial) {
      this.state = 'captcha_detected';
      return {
        status: 'blocked',
        pageState,
        requires: 'human_intervention',
        error: `Interstitial: ${pageState.interstitial}`,
      };
    }

    this.state = 'page_ready';
    return { status: 'success', pageState };
  }

  private async checkForInterstitial(): Promise<BridgeResponse | null> {
    const pageState = await extractPageState(this.page!);
    if (pageState.interstitial) {
      this.state = 'captcha_detected';
      this.hitlGate.emit('interstitial', {
        type: pageState.interstitial,
        url: this.page!.url(),
      });
      return {
        status: 'blocked',
        pageState,
        requires: 'human_intervention',
        error: `Blocked by ${pageState.interstitial} — waiting for human`,
      };
    }
    return null;
  }

  async waitForInterstitialResolution(pollIntervalMs: number = 2000): Promise<PageState> {
    log.info('Waiting for human to resolve interstitial...');

    while (this.state === 'captcha_detected') {
      await sleep(pollIntervalMs);
      const pageState = await extractPageState(this.page!);
      if (!pageState.interstitial) {
        this.state = 'page_ready';
        log.info('Interstitial resolved');
        return pageState;
      }
    }

    return extractPageState(this.page!);
  }

  getState(): BridgeState {
    return this.state;
  }

  private isDomainAllowed(url: string): boolean {
    try {
      const hostname = new URL(url).hostname;
      return this.config.allowedDomains.some(
        (d) => hostname === d || hostname.endsWith(`.${d}`)
      );
    } catch {
      return false;
    }
  }

  private ensurePage(): asserts this is { page: Page } {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
  }
}
