import type { Page } from 'playwright';

/**
 * Log-normal delay modeling human reaction time.
 * baseMs is the median; variance controls spread.
 */
export function humanDelay(baseMs: number, variance: number = 0.4): number {
  const mu = Math.log(baseMs);
  const sigma = variance;
  const u1 = Math.random();
  const u2 = Math.random();
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(50, Math.round(Math.exp(mu + sigma * normal)));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function humanType(page: Page, selector: string, text: string): Promise<void> {
  await humanClick(page, selector);
  await sleep(humanDelay(200));

  // Clear existing text with keyboard shortcuts (more human than triple-click select-all)
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await sleep(humanDelay(80));
  await page.keyboard.press('Backspace');
  await sleep(humanDelay(150));

  for (const char of text) {
    await page.keyboard.type(char, { delay: 0 });
    await sleep(humanDelay(90, 0.5));
  }
}

export async function humanClick(page: Page, selector: string): Promise<void> {
  const element = await page.waitForSelector(selector, { timeout: 10_000 });
  if (!element) throw new Error(`Element not found: ${selector}`);

  const box = await element.boundingBox();
  if (!box) throw new Error(`Element not visible: ${selector}`);

  // Click a random point within the element, biased toward center
  const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
  const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);

  // First, move the mouse from its current position with a natural curve
  await curvedMouseMove(page, targetX, targetY);

  await sleep(humanDelay(60));
  await page.mouse.down();
  await sleep(humanDelay(50, 0.3));
  await page.mouse.up();
}

async function curvedMouseMove(page: Page, targetX: number, targetY: number): Promise<void> {
  // Generate a slightly curved path using quadratic bezier
  const steps = 12 + Math.floor(Math.random() * 8);

  // Random control point for the bezier curve — introduces a slight arc
  const cpX = targetX + (Math.random() - 0.5) * 100;
  const cpY = targetY + (Math.random() - 0.5) * 60;

  // We don't know the current mouse position, so start from a reasonable offset
  const startX = targetX + (Math.random() - 0.5) * 200;
  const startY = targetY + (Math.random() - 0.5) * 150;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Quadratic bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
    const x = (1 - t) ** 2 * startX + 2 * (1 - t) * t * cpX + t ** 2 * targetX;
    const y = (1 - t) ** 2 * startY + 2 * (1 - t) * t * cpY + t ** 2 * targetY;
    await page.mouse.move(x, y);
    // Decelerate near target
    const delay = i > steps * 0.7 ? humanDelay(8) : humanDelay(4);
    await sleep(delay);
  }
}

export async function humanScroll(
  page: Page,
  direction: 'up' | 'down',
  amount: 'small' | 'medium' | 'page'
): Promise<void> {
  const pixelAmounts = { small: 200, medium: 450, page: 800 };
  const totalPixels = pixelAmounts[amount];
  const sign = direction === 'down' ? 1 : -1;

  // Scroll in 3-5 increments with pauses
  const increments = 3 + Math.floor(Math.random() * 3);
  const perIncrement = totalPixels / increments;

  for (let i = 0; i < increments; i++) {
    const jitteredAmount = perIncrement * (0.8 + Math.random() * 0.4);
    await page.mouse.wheel(0, sign * jitteredAmount);
    await sleep(humanDelay(200, 0.6));
  }
}

export async function waitForPageStable(page: Page, timeoutMs: number = 15_000): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout: timeoutMs });
  } catch {
    // Network idle timeout is acceptable — some pages never fully idle due to
    // persistent connections (analytics, chat widgets, etc.)
  }
  // Additional settle time for JS-rendered content
  await sleep(humanDelay(600));
}
