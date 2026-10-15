import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type { ActionCommand, ApprovalRequest, ApprovalResponse, PageState } from '../types/index.js';
import { getActionTier } from '../types/index.js';
import pino from 'pino';

const log = pino({ name: 'hitl-gate' });

export class HITLGate extends EventEmitter {
  private pendingApprovals = new Map<string, {
    resolve: (response: ApprovalResponse) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>();

  private approvalTimeoutMs: number;

  constructor(approvalTimeoutMs: number = 300_000) {
    super();
    this.approvalTimeoutMs = approvalTimeoutMs;
  }

  async checkAction(action: ActionCommand, pageState: PageState): Promise<ApprovalResponse> {
    const tier = getActionTier(action.action);

    if (tier === 'autonomous') {
      return { approved: true };
    }

    if (tier === 'notify') {
      this.emit('notification', { action, pageState, timestamp: Date.now() });
      return { approved: true };
    }

    // tier === 'gate' — block until human responds
    return this.requestApproval(action, pageState);
  }

  private requestApproval(action: ActionCommand, pageState: PageState): Promise<ApprovalResponse> {
    const id = randomUUID();
    const request: ApprovalRequest = {
      id,
      action,
      pageState,
      timestamp: Date.now(),
    };

    log.info({ action: action.action, id }, 'Requesting human approval');
    this.emit('approval_required', request);

    return new Promise<ApprovalResponse>((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingApprovals.delete(id);
        log.warn({ id }, 'Approval timed out');
        resolve({ approved: false, reason: 'Approval timed out — human did not respond' });
      }, this.approvalTimeoutMs);

      this.pendingApprovals.set(id, { resolve, timeout });
    });
  }

  resolveApproval(id: string, approved: boolean, reason?: string): boolean {
    const pending = this.pendingApprovals.get(id);
    if (!pending) return false;

    clearTimeout(pending.timeout);
    this.pendingApprovals.delete(id);
    pending.resolve({ approved, reason });

    log.info({ id, approved, reason }, 'Approval resolved');
    return true;
  }

  get pendingCount(): number {
    return this.pendingApprovals.size;
  }
}
