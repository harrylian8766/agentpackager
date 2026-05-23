import express from 'express';
import expressWs from 'express-ws';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const app = express();
expressWs(app);

// ── Capability Auto-Discovery ────────────────────────────────────────────
const capabilityHandlers: Record<string, Function> = {};

async function loadCapability(id: string): Promise<Function | null> {
  const paths = [
    join(process.cwd(), 'src', 'capabilities', `${id}.ts`),
    join(process.cwd(), 'src', 'capabilities', `${id}.js`),
    join(process.cwd(), 'dist', 'capabilities', `${id}.js`),
  ];
  for (const p of paths) {
    if (!existsSync(p)) continue;
    try {
      const mod = await import(p);
      return mod.default || mod.handler || null;
    } catch { /* ignore */ }
  }
  return null;
}

async function preloadCapabilities() {
  const capDir = join(process.cwd(), 'src', 'capabilities');
  if (!existsSync(capDir)) return;
  const files = readdirSync(capDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
  for (const file of files) {
    const id = file.replace(/\.(ts|js)$/, '');
    const handler = await loadCapability(id);
    if (handler) {
      capabilityHandlers[id] = handler;
      console.log(`  ✓ capability loaded: ${id}`);
    }
  }
}

// ── Stubs ─────────────────────────────────────────────────────────────────

// Stub: greet
async function greetStub(input: any): Promise<any> {
  console.warn(`[stub] greet — implement in src/capabilities/greet.ts`);
  return {
    message: "Hello message"
  };
}
// Stub: echo
async function echoStub(input: any): Promise<any> {
  console.warn(`[stub] echo — implement in src/capabilities/echo.ts`);
  return {
    echoed: "Hello echoed"
  };
}

// ── WebSocket endpoint ──────────────────────────────────────────────────

app.ws('/ws', (ws, req) => {
  console.log('[ws] client connected: ' + req.ip);

  ws.on('message', async (message: string) => {
    try {
      const request = JSON.parse(message);
      const { type, id, payload } = request;

      if (type !== 'call' || !id) {
        ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format. Expected: { type: "call", id, payload }' }));
        return;
      }

      let result: any;

      switch (id) {
      case "greet": {
        const handler = capabilityHandlers["greet"];
        result = handler ? await handler(payload) : await greetStub(payload);
        break;
      }
      case "echo": {
        const handler = capabilityHandlers["echo"];
        result = handler ? await handler(payload) : await echoStub(payload);
        break;
      }
        default:
          ws.send(JSON.stringify({ type: 'error', id, error: `Unknown capability: ${id}` }));
          return;
      }

      ws.send(JSON.stringify({
        type: 'result',
        id,
        payload: result,
        timestamp: new Date().toISOString(),
      }));
    } catch (err: any) {
      ws.send(JSON.stringify({ type: 'error', error: err.message }));
    }
  });

  ws.on('close', () => {
    console.log('[ws] client disconnected: ' + req.ip);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    agent: 'hello-world',
    version: '1.0.0',
    capabilities: ["greet", "echo"],
    loaded: Object.keys(capabilityHandlers),
  }));
});

// ── REST health check ───────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    agent: 'hello-world',
    version: '1.0.0',
    websocket: '/ws',
    loaded: Object.keys(capabilityHandlers),
  });
});

// ── Start ────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

preloadCapabilities().then(() => {
  app.listen(PORT, () => {
    console.log('🚀 hello-world WebSocket running on ws://localhost:' + PORT + '/ws');
    console.log('   Health check: http://localhost:' + PORT + '/health');
    console.log('   Loaded capabilities: ' + (Object.keys(capabilityHandlers).join(', ') || 'none (using stubs)'));
  });
});