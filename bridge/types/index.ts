import { z } from 'zod';

// --- Action Tiers ---

export type ActionTier = 'autonomous' | 'notify' | 'gate';

// --- Bridge State Machine ---

export type BridgeState =
  | 'idle'
  | 'navigating'
  | 'page_ready'
  | 'extracting'
  | 'waiting_for_llm'
  | 'executing_action'
  | 'captcha_detected'
  | 'hitl_waiting'
  | 'error_recovery';

// --- Page Extraction ---

export interface PageState {
  url: string;
  pageType: PageType;
  title: string;
  items?: ProductSummary[];
  cartSummary?: CartSummary;
  notices: string[];
  interstitial?: InterstitialType;
}

export type PageType =
  | 'search_results'
  | 'product_detail'
  | 'cart'
  | 'checkout'
  | 'order_confirmation'
  | 'login'
  | 'captcha'
  | 'account_settings'
  | 'unknown';

export type InterstitialType = 'captcha' | '2fa' | 'session_expired' | 'legal_notice';

export interface ProductSummary {
  asin?: string;
  name: string;
  price?: string;
  rating?: string;
  reviewCount?: string;
  availability?: string;
  seller?: string;
  isPrime?: boolean;
}

export interface CartSummary {
  items: CartItem[];
  subtotal: string;
  itemCount: number;
}

export interface CartItem {
  name: string;
  price: string;
  quantity: number;
  asin?: string;
}

// --- LLM Commands ---

export const ActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('navigate'),
    url: z.string().url(),
  }),
  z.object({
    action: z.literal('search'),
    query: z.string().min(1).max(200),
  }),
  z.object({
    action: z.literal('view_product'),
    asin: z.string(),
  }),
  z.object({
    action: z.literal('add_to_cart'),
    asin: z.string(),
  }),
  z.object({
    action: z.literal('remove_from_cart'),
    asin: z.string(),
  }),
  z.object({
    action: z.literal('update_quantity'),
    asin: z.string(),
    quantity: z.number().int().min(0).max(99),
  }),
  z.object({
    action: z.literal('view_cart'),
  }),
  z.object({
    action: z.literal('proceed_to_checkout'),
  }),
  z.object({
    action: z.literal('place_order'),
  }),
  z.object({
    action: z.literal('scroll'),
    direction: z.enum(['up', 'down']),
    amount: z.enum(['small', 'medium', 'page']).default('medium'),
  }),
  z.object({
    action: z.literal('get_page_state'),
  }),
]);

export type ActionCommand = z.infer<typeof ActionSchema>;

// --- Action Tier Classification ---

const ACTION_TIERS: Record<ActionCommand['action'], ActionTier> = {
  navigate: 'autonomous',
  search: 'autonomous',
  view_product: 'autonomous',
  scroll: 'autonomous',
  get_page_state: 'autonomous',
  add_to_cart: 'notify',
  remove_from_cart: 'notify',
  update_quantity: 'notify',
  view_cart: 'autonomous',
  proceed_to_checkout: 'gate',
  place_order: 'gate',
};

export function getActionTier(action: ActionCommand['action']): ActionTier {
  return ACTION_TIERS[action];
}

// --- Bridge Response ---

export interface BridgeResponse {
  status: 'success' | 'error' | 'pending_approval' | 'blocked' | 'rate_limited';
  pageState?: PageState;
  error?: string;
  requires?: 'human_intervention' | 'approval';
  retryAfterMs?: number;
}

// --- HITL ---

export interface ApprovalRequest {
  id: string;
  action: ActionCommand;
  pageState: PageState;
  timestamp: number;
}

export interface ApprovalResponse {
  approved: boolean;
  reason?: string;
}

// --- Rate Limits ---

export interface RateLimits {
  pageNavigationsPerMinute: number;
  searchesPerHour: number;
  addToCartPerHour: number;
  checkoutAttemptsPerDay: number;
  maxSessionDurationMinutes: number;
}

export const DEFAULT_RATE_LIMITS: RateLimits = {
  pageNavigationsPerMinute: 4,
  searchesPerHour: 15,
  addToCartPerHour: 10,
  checkoutAttemptsPerDay: 3,
  maxSessionDurationMinutes: 120,
};

// --- Config ---

export interface LocalCartConfig {
  userDataDir: string;
  headless: boolean;
  allowedDomains: string[];
  rateLimits: RateLimits;
  llmEndpoint: string;
  bridgePort: number;
  uiPort: number;
}
