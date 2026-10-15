import type { ActionCommand, RateLimits } from '../types/index.js';
import { DEFAULT_RATE_LIMITS } from '../types/index.js';

interface BucketEntry {
  timestamps: number[];
}

export class RateLimiter {
  private limits: RateLimits;
  private buckets = new Map<string, BucketEntry>();
  private sessionStart: number;

  constructor(limits: RateLimits = DEFAULT_RATE_LIMITS) {
    this.limits = limits;
    this.sessionStart = Date.now();
  }

  check(action: ActionCommand): { allowed: boolean; retryAfterMs?: number; reason?: string } {
    const now = Date.now();

    // Session duration check
    const elapsed = (now - this.sessionStart) / 60_000;
    if (elapsed > this.limits.maxSessionDurationMinutes) {
      return {
        allowed: false,
        reason: `Session duration exceeded (${Math.round(elapsed)}min / ${this.limits.maxSessionDurationMinutes}min max). Take a break.`,
      };
    }

    const checks = this.getChecksForAction(action, now);
    for (const check of checks) {
      const bucket = this.getBucket(check.key);
      const windowStart = now - check.windowMs;
      const recent = bucket.timestamps.filter((t) => t > windowStart);

      if (recent.length >= check.limit) {
        const oldestInWindow = recent[0];
        const retryAfterMs = oldestInWindow + check.windowMs - now;
        return {
          allowed: false,
          retryAfterMs: Math.max(1000, retryAfterMs),
          reason: `Rate limit: ${check.key} (${recent.length}/${check.limit} per ${check.windowDesc})`,
        };
      }
    }

    return { allowed: true };
  }

  record(action: ActionCommand): void {
    const now = Date.now();
    const checks = this.getChecksForAction(action, now);
    for (const check of checks) {
      const bucket = this.getBucket(check.key);
      bucket.timestamps.push(now);
      // Prune old entries
      const cutoff = now - check.windowMs * 2;
      bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
    }
  }

  private getChecksForAction(
    action: ActionCommand,
    _now: number
  ): Array<{ key: string; limit: number; windowMs: number; windowDesc: string }> {
    const checks: Array<{ key: string; limit: number; windowMs: number; windowDesc: string }> = [];

    // All navigation actions count toward the per-minute limit
    if (['navigate', 'search', 'view_product', 'view_cart'].includes(action.action)) {
      checks.push({
        key: 'navigations',
        limit: this.limits.pageNavigationsPerMinute,
        windowMs: 60_000,
        windowDesc: 'minute',
      });
    }

    if (action.action === 'search') {
      checks.push({
        key: 'searches',
        limit: this.limits.searchesPerHour,
        windowMs: 3_600_000,
        windowDesc: 'hour',
      });
    }

    if (action.action === 'add_to_cart') {
      checks.push({
        key: 'add_to_cart',
        limit: this.limits.addToCartPerHour,
        windowMs: 3_600_000,
        windowDesc: 'hour',
      });
    }

    if (['proceed_to_checkout', 'place_order'].includes(action.action)) {
      checks.push({
        key: 'checkout',
        limit: this.limits.checkoutAttemptsPerDay,
        windowMs: 86_400_000,
        windowDesc: 'day',
      });
    }

    return checks;
  }

  private getBucket(key: string): BucketEntry {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      this.buckets.set(key, bucket);
    }
    return bucket;
  }
}
