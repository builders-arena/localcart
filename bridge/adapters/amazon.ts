/**
 * Amazon-specific selectors and detection patterns.
 * Isolated here so adding other retailers means adding a new adapter file,
 * not touching the core bridge.
 */

export const SELECTORS = {
  searchBox: '#twotabsearchtextbox',
  searchButton: '#nav-search-submit-button',
  addToCart: '#add-to-cart-button',
  buyNow: '#buy-now-button',
  cartIcon: '#nav-cart',
  cartCount: '#nav-cart-count',
  proceedToCheckout: '#sc-buy-box-ptc-button input, [name="proceedToRetailCheckout"]',
  placeOrder: '#submitOrderButtonId input, [name="placeYourOrder1"]',
  productTitle: '#productTitle',
  productPrice: '.a-price .a-offscreen, #priceblock_ourprice',
  searchResult: '[data-component-type="s-search-result"]',
  cartItem: '.sc-list-item, [data-item-count]',

  // Interstitial / anti-bot
  captchaForm: 'form[action*="validateCaptcha"]',
  captchaInput: '#captchacharacters',
  robotCheckImage: '#auth-captcha-image',

  // Cart confirmation overlays
  addedToCartConfirm: '#NATC_SMART_WAGON_CONF_MSG_SUCCESS, #huc-v2-order-row-confirm-text',
  sideSheet: '#attach-sideSheet',
} as const;

export const ROBOT_CHECK_INDICATORS = [
  '/errors/validateCaptcha',
  'robot check',
  'automated access',
  'sorry, we just need to make sure',
  'type the characters you see',
] as const;

export function isRobotCheckUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return ROBOT_CHECK_INDICATORS.some((indicator) => lower.includes(indicator));
}

export function isRobotCheckText(bodyText: string): boolean {
  const lower = bodyText.toLowerCase();
  return ROBOT_CHECK_INDICATORS.some((indicator) => lower.includes(indicator));
}

/**
 * Account page URLs the bot should never navigate to autonomously.
 * The bridge blocks these regardless of what the LLM requests.
 */
export const RESTRICTED_PATHS = [
  '/gp/css/account',       // account settings
  '/cpe/managepaymentmethods', // payment methods
  '/a/addresses',          // address book
  '/gp/css/order-history', // order history (read-only, but gated)
  '/gp/digital/fiona',     // Kindle / digital content management
] as const;

export function isRestrictedPath(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return RESTRICTED_PATHS.some((p) => pathname.startsWith(p));
  } catch {
    return false;
  }
}
