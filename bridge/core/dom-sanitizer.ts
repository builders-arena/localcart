import type { Page } from 'playwright';
import type { PageState, PageType, ProductSummary, CartSummary, InterstitialType } from '../types/index.js';

// PII patterns — matched and replaced before any data leaves the machine
const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: '[CARD ••••]' },
  { pattern: /\b\d{4}[\s-]?\d{6}[\s-]?\d{5}\b/g, replacement: '[CARD ••••]' }, // Amex format
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
  { pattern: /\b\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, replacement: '[PHONE]' },
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN REDACTED]' },
  { pattern: /\b\d{5}(-\d{4})?\b/g, replacement: '[ZIP]' },
];

// Selectors whose text content is always fully redacted
const PII_CONTAINER_SELECTORS = [
  '.payment-method-container',
  '#payment-information',
  '.ship-to-this-address',
  '#address-book-entry',
  '.payment-instrument',
  '[data-component-type="s-payment"]',
];

export async function extractPageState(page: Page): Promise<PageState> {
  const url = page.url();
  const pageType = classifyPage(url, await page.title());

  // Check for interstitials first
  const interstitial = await detectInterstitial(page);
  if (interstitial) {
    return {
      url,
      pageType: interstitial === 'captcha' ? 'captcha' : pageType,
      title: await page.title(),
      notices: [`Interstitial detected: ${interstitial}`],
      interstitial,
    };
  }

  const state: PageState = {
    url,
    pageType,
    title: sanitizeText(await page.title()),
    notices: [],
  };

  switch (pageType) {
    case 'search_results':
      state.items = await extractSearchResults(page);
      break;
    case 'product_detail':
      state.items = [await extractProductDetail(page)];
      break;
    case 'cart':
      state.cartSummary = await extractCart(page);
      break;
    case 'checkout':
      state.notices.push('Checkout page — details redacted for security');
      state.cartSummary = await extractCart(page);
      break;
    case 'login':
      state.notices.push('Login page detected — human intervention required');
      break;
    case 'account_settings':
      state.notices.push('Account settings — access restricted');
      break;
  }

  return state;
}

function classifyPage(url: string, title: string): PageType {
  const u = url.toLowerCase();
  if (u.includes('/errors/validatecaptcha') || u.includes('captcha')) return 'captcha';
  if (u.includes('/ap/signin') || u.includes('/ap/login')) return 'login';
  if (u.includes('/gp/cart') || u.includes('/cart')) return 'cart';
  if (u.includes('/gp/buy') || u.includes('/checkout')) return 'checkout';
  if (u.includes('/gp/css') || u.includes('/account')) return 'account_settings';
  if (u.includes('/s?') || u.includes('/s/')) return 'search_results';
  if (u.match(/\/dp\/[A-Z0-9]{10}/i) || u.includes('/product/')) return 'product_detail';
  if (u.includes('/gp/thankyou') || title.toLowerCase().includes('order placed')) return 'order_confirmation';
  return 'unknown';
}

async function detectInterstitial(page: Page): Promise<InterstitialType | null> {
  const checks: Array<{ type: InterstitialType; selector: string }> = [
    { type: 'captcha', selector: 'form[action*="validateCaptcha"]' },
    { type: 'captcha', selector: '#captchacharacters' },
    { type: 'captcha', selector: 'iframe[src*="recaptcha"]' },
    { type: 'captcha', selector: 'iframe[src*="hcaptcha"]' },
    { type: '2fa', selector: '#auth-mfa-otpcode' },
    { type: '2fa', selector: 'input[name="otpCode"]' },
    { type: 'session_expired', selector: '#ap_email_login' },
  ];

  for (const check of checks) {
    const found = await page.$(check.selector);
    if (found) return check.type;
  }

  // Check page text for robot detection
  const bodyText = await page.textContent('body').catch(() => '');
  if (bodyText && /sorry.*we just need to make sure you're not a robot/i.test(bodyText)) {
    return 'captcha';
  }

  return null;
}

async function extractSearchResults(page: Page): Promise<ProductSummary[]> {
  return page.$$eval('[data-component-type="s-search-result"]', (elements) => {
    return elements.slice(0, 15).map((el) => {
      const nameEl = el.querySelector('h2 a span, h2 span');
      const priceWhole = el.querySelector('.a-price-whole');
      const priceFraction = el.querySelector('.a-price-fraction');
      const ratingEl = el.querySelector('.a-icon-alt');
      const reviewEl = el.querySelector('[aria-label*="stars"] + span, .a-size-base.s-underline-text');
      const asin = el.getAttribute('data-asin') || undefined;
      const primeEl = el.querySelector('.a-icon-prime, [aria-label*="Prime"]');

      let price: string | undefined;
      if (priceWhole) {
        price = `$${priceWhole.textContent?.trim() || ''}${priceFraction?.textContent?.trim() || ''}`;
      }

      return {
        asin,
        name: nameEl?.textContent?.trim() || 'Unknown product',
        price,
        rating: ratingEl?.textContent?.trim()?.replace(' out of 5 stars', '★') || undefined,
        reviewCount: reviewEl?.textContent?.trim() || undefined,
        isPrime: !!primeEl,
      };
    });
  });
}

async function extractProductDetail(page: Page): Promise<ProductSummary> {
  return page.evaluate(() => {
    const title = document.querySelector('#productTitle')?.textContent?.trim() || 'Unknown';
    const priceEl = document.querySelector('.a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice');
    const ratingEl = document.querySelector('#acrPopover .a-icon-alt');
    const reviewEl = document.querySelector('#acrCustomerReviewText');
    const availEl = document.querySelector('#availability span');
    const sellerEl = document.querySelector('#sellerProfileTriggerId, #merchant-info');
    const primeEl = document.querySelector('#primeBadge, .a-icon-prime');

    const asinMatch = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/i);

    return {
      asin: asinMatch?.[1] || undefined,
      name: title,
      price: priceEl?.textContent?.trim() || undefined,
      rating: ratingEl?.textContent?.trim() || undefined,
      reviewCount: reviewEl?.textContent?.trim() || undefined,
      availability: availEl?.textContent?.trim() || undefined,
      seller: sellerEl?.textContent?.trim() || undefined,
      isPrime: !!primeEl,
    };
  });
}

async function extractCart(page: Page): Promise<CartSummary> {
  return page.evaluate(() => {
    const itemEls = document.querySelectorAll('[data-item-count], .sc-list-item');
    const items = Array.from(itemEls).map((el) => {
      const name = el.querySelector('.sc-product-title, .a-truncate-cut')?.textContent?.trim() || 'Unknown';
      const price = el.querySelector('.sc-product-price, .a-price .a-offscreen')?.textContent?.trim() || '$0.00';
      const qtyEl = el.querySelector('.a-dropdown-prompt, input[name*="quantity"]');
      const quantity = parseInt(qtyEl?.textContent?.trim() || (qtyEl as HTMLInputElement)?.value || '1', 10);
      const asin = el.getAttribute('data-asin') || undefined;
      return { name, price, quantity, asin };
    });

    const subtotalEl = document.querySelector('#sc-subtotal-amount-activecart, .sc-subtotal-activecart');
    const subtotal = subtotalEl?.textContent?.trim() || '$0.00';
    const countEl = document.querySelector('#sc-subtotal-label-activecart');
    const countMatch = countEl?.textContent?.match(/\((\d+)/);

    return {
      items,
      subtotal,
      itemCount: countMatch ? parseInt(countMatch[1], 10) : items.length,
    };
  });
}

function sanitizeText(text: string): string {
  let result = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export async function redactPIIContainers(page: Page): Promise<void> {
  // Runs inside the browser to blank out PII containers before extraction
  for (const selector of PII_CONTAINER_SELECTORS) {
    await page.$$eval(selector, (elements) => {
      elements.forEach((el) => {
        (el as HTMLElement).innerText = '[REDACTED — sensitive information]';
      });
    }).catch(() => { /* selector not present on this page */ });
  }
}
