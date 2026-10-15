#!/usr/bin/env node

import { parseArgs } from 'node:util';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { createServer } from 'node:http';
import Fastify from 'fastify';
import { WebSocketServer, WebSocket } from 'ws';
import pino from 'pino';
import { SessionManager } from './core/session-manager.js';
import {
  ActionSchema,
  DEFAULT_RATE_LIMITS,
  type LocalCartConfig,
  type ApprovalRequest,
} from './types/index.js';

// ─── Argument parsing ────────────────────────────────────────────────

const { values: flags } = parseArgs({
  options: {
    headless:       { type: 'boolean', default: false },
    port:           { type: 'string',  default: '7700' },
    'ui-port':      { type: 'string',  default: '7701' },
    'profile-path': { type: 'string' },
    'allowed-domains': { type: 'string', default: 'amazon.com,www.amazon.com' },
    help:           { type: 'boolean', short: 'h', default: false },
    version:        { type: 'boolean', short: 'v', default: false },
  },
  strict: true,
  allowPositionals: false,
});

if (flags.version) {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
  console.log(`localcart v${pkg.version}`);
  process.exit(0);
}

if (flags.help) {
  console.log(`
  localcart — Local-first AI shopping agent bridge

  USAGE
    localcart [options]

  OPTIONS
    --headless            Run browser without visible window (default: false)
    --port <n>            Bridge RPC port for LLM communication (default: 7700)
    --ui-port <n>         Control panel WebSocket port (default: 7701)
    --profile-path <dir>  Chrome user data directory (default: ~/.localcart/profile)
    --allowed-domains <d> Comma-separated domain allowlist (default: amazon.com)
    -v, --version         Print version
    -h, --help            Show this message

  ENVIRONMENT VARIABLES
    LOCALCART_LLM_ENDPOINT   Local LLM API URL (default: http://localhost:11434)

  EXAMPLES
    localcart                                     # Standard launch
    localcart --headless --port 8080              # Headless on custom port
    localcart --profile-path ~/my-chrome-profile  # Use existing Chrome profile
  `);
  process.exit(0);
}

// ─── Configuration ───────────────────────────────────────────────────

const defaultProfilePath = path.join(os.homedir(), '.localcart', 'browser-profile');

const config: LocalCartConfig = {
  userDataDir: flags['profile-path'] || defaultProfilePath,
  headless: flags.headless ?? false,
  allowedDomains: (flags['allowed-domains'] || 'amazon.com,www.amazon.com')
    .split(',')
    .map((d) => d.trim()),
  rateLimits: DEFAULT_RATE_LIMITS,
  llmEndpoint: process.env.LOCALCART_LLM_ENDPOINT || 'http://localhost:11434',
  bridgePort: parseInt(flags.port || '7700', 10),
  uiPort: parseInt(flags['ui-port'] || '7701', 10),
};

// Ensure profile directory exists
fs.mkdirSync(config.userDataDir, { recursive: true });

// ─── Logger ──────────────────────────────────────────────────────────

const log = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
  },
});

// ─── Session & Servers ───────────────────────────────────────────────

const session = new SessionManager(config);

// --- Bridge HTTP Server (LLM-facing, JSON-RPC) ---

const bridge = Fastify({ logger: false });

bridge.post('/rpc', async (request, reply) => {
  const body = request.body as {
    jsonrpc: string;
    id: number;
    method: string;
    params?: unknown;
  };

  if (body.jsonrpc !== '2.0') {
    return reply.status(400).send({ error: 'Expected JSON-RPC 2.0' });
  }

  try {
    switch (body.method) {
      case 'execute': {
        const parsed = ActionSchema.safeParse(body.params);
        if (!parsed.success) {
          return reply.send({
            jsonrpc: '2.0',
            id: body.id,
            error: { code: -32602, message: 'Invalid params', data: parsed.error.issues },
          });
        }

        const result = await session.executeAction(parsed.data);
        broadcastToUI({ type: 'action_executed', action: parsed.data, result });
        return reply.send({ jsonrpc: '2.0', id: body.id, result });
      }

      case 'navigate': {
        const { url } = body.params as { url: string };
        const pageState = await session.navigateAndExtract(url);
        broadcastToUI({ type: 'page_navigated', pageState });
        return reply.send({
          jsonrpc: '2.0',
          id: body.id,
          result: { status: 'success', pageState },
        });
      }

      case 'get_state': {
        return reply.send({
          jsonrpc: '2.0',
          id: body.id,
          result: { bridgeState: session.getState() },
        });
      }

      default:
        return reply.send({
          jsonrpc: '2.0',
          id: body.id,
          error: { code: -32601, message: `Unknown method: ${body.method}` },
        });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error({ method: body.method, error: message }, 'RPC error');
    return reply.send({
      jsonrpc: '2.0',
      id: body.id,
      error: { code: -32000, message },
    });
  }
});

// --- Control Panel WebSocket (UI-facing) ---

const uiServer = createServer();
const wss = new WebSocketServer({ server: uiServer });
const uiClients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  uiClients.add(ws);
  log.info('Control panel client connected');

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'approval_response' && msg.id) {
        session.hitlGate.resolveApproval(msg.id, !!msg.approved, msg.reason);
      }
    } catch {
      // ignore malformed UI messages
    }
  });

  ws.on('close', () => uiClients.delete(ws));

  ws.send(JSON.stringify({ type: 'bridge_state', state: session.getState() }));
});

function broadcastToUI(message: Record<string, unknown>): void {
  const payload = JSON.stringify(message);
  for (const client of uiClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// Forward HITL events to the control panel
session.hitlGate.on('approval_required', (req: ApprovalRequest) => {
  broadcastToUI({ type: 'approval_required', request: req });
});

session.hitlGate.on('notification', (data: unknown) => {
  broadcastToUI({ type: 'notification', data });
});

session.hitlGate.on('interstitial', (data: unknown) => {
  broadcastToUI({ type: 'interstitial', data });
});

// ─── Startup ─────────────────────────────────────────────────────────

async function main(): Promise<void> {
  await session.launch();

  await bridge.listen({ port: config.bridgePort, host: '127.0.0.1' });
  uiServer.listen(config.uiPort, '127.0.0.1');

  const dim = '\x1b[2m';
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';
  const green = '\x1b[32m';
  const cyan = '\x1b[36m';

  console.log(`
${bold}${green}  LocalCart is ready.${reset}

${dim}  ───────────────────────────────────────────${reset}
   Bridge RPC     ${cyan}http://127.0.0.1:${config.bridgePort}/rpc${reset}
   Control Panel  ${cyan}http://127.0.0.1:${config.uiPort}${reset}
   Browser Mode   ${config.headless ? 'headless' : 'visible (headful)'}
   Profile        ${dim}${config.userDataDir}${reset}
   Domains        ${config.allowedDomains.join(', ')}
${dim}  ───────────────────────────────────────────${reset}

  ${dim}Point your LLM at the Bridge RPC endpoint.
  Open the Control Panel URL in a browser to monitor and approve actions.
  Press Ctrl+C to stop.${reset}
`);

  const shutdown = async () => {
    log.info('Shutting down...');
    await session.shutdown();
    uiServer.close();
    await bridge.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  log.fatal({ error: err }, 'Failed to start LocalCart');
  process.exit(1);
});
