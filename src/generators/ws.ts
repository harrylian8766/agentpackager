import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { AgentManifest } from "../core/types.js";
import { loadTemplate, toCamelCase, generateExample, formatTsObject } from "./utils.js";

/**
 * Generate WebSocket Server from Agent Manifest
 */
export function generateWebSocket(manifest: AgentManifest, outputDir: string): void {
  const wsDir = join(outputDir, "ws");
  mkdirSync(wsDir, { recursive: true });

  const wsPath = manifest.protocols?.websocket?.path || "/ws";

  // Generate capability stubs
  const stubs: string[] = [];
  const switchCases: string[] = [];
  const capabilitiesList: string[] = [];

  for (const cap of manifest.capabilities) {
    const capId = cap.id;
    const capCamel = toCamelCase(capId);
    capabilitiesList.push(`"${capId}"`);

    // Generate stub
    const exampleOutput = generateExample(cap.outputSchema);
    const outputLines = formatTsObject(exampleOutput, 4);

    stubs.push(`// Stub: ${capId}
async function ${capCamel}Stub(input: any): Promise<any> {
  console.warn(\`[stub] ${capId} — implement in src/capabilities/${capId}.ts\`);
  return {
${outputLines}
  };
}`);

    // Generate switch case
    switchCases.push(`      case "${capId}": {
        const handler = capabilityHandlers["${capId}"];
        result = handler ? await handler(payload) : await ${capCamel}Stub(payload);
        break;
      }`);
  }

  // Build server code
  const serverCode = [
    "import express from 'express';",
    "import expressWs from 'express-ws';",
    "import { readdirSync, existsSync } from 'node:fs';",
    "import { join } from 'node:path';",
    "",
    "const app = express();",
    "expressWs(app);",
    "",
    "// ── Capability Auto-Discovery ────────────────────────────────────────────",
    "const capabilityHandlers: Record<string, Function> = {};",
    "",
    "async function loadCapability(id: string): Promise<Function | null> {",
    "  const paths = [",
    "    join(process.cwd(), 'src', 'capabilities', `${id}.ts`),",
    "    join(process.cwd(), 'src', 'capabilities', `${id}.js`),",
    "    join(process.cwd(), 'dist', 'capabilities', `${id}.js`),",
    "  ];",
    "  for (const p of paths) {",
    "    if (!existsSync(p)) continue;",
    "    try {",
    "      const mod = await import(p);",
    "      return mod.default || mod.handler || null;",
    "    } catch { /* ignore */ }",
    "  }",
    "  return null;",
    "}",
    "",
    "async function preloadCapabilities() {",
    "  const capDir = join(process.cwd(), 'src', 'capabilities');",
    "  if (!existsSync(capDir)) return;",
    "  const files = readdirSync(capDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));",
    "  for (const file of files) {",
    "    const id = file.replace(/\\.(ts|js)$/, '');",
    "    const handler = await loadCapability(id);",
    "    if (handler) {",
    "      capabilityHandlers[id] = handler;",
    "      console.log(`  ✓ capability loaded: ${id}`);",
    "    }",
    "  }",
    "}",
    "",
    "// ── Stubs ─────────────────────────────────────────────────────────────────",
    "",
    ...stubs,
    "",
    "// ── WebSocket endpoint ──────────────────────────────────────────────────",
    "",
    `app.ws('${wsPath}', (ws, req) => {`,
    `  console.log('[ws] client connected: ' + req.ip);`,
    "",
    "  ws.on('message', async (message: string) => {",
    "    try {",
    "      const request = JSON.parse(message);",
    "      const { type, id, payload } = request;",
    "",
    "      if (type !== 'call' || !id) {",
    "        ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format. Expected: { type: \"call\", id, payload }' }));",
    "        return;",
    "      }",
    "",
    "      let result: any;",
    "",
    "      switch (id) {",
    ...switchCases,
    "        default:",
    "          ws.send(JSON.stringify({ type: 'error', id, error: `Unknown capability: ${id}` }));",
    "          return;",
    "      }",
    "",
    "      ws.send(JSON.stringify({",
    "        type: 'result',",
    "        id,",
    "        payload: result,",
    "        timestamp: new Date().toISOString(),",
    "      }));",
    "    } catch (err: any) {",
    "      ws.send(JSON.stringify({ type: 'error', error: err.message }));",
    "    }",
    "  });",
    "",
    "  ws.on('close', () => {",
    `    console.log('[ws] client disconnected: ' + req.ip);`,
    "  });",
    "",
    "  // Send welcome message",
    "  ws.send(JSON.stringify({",
    "    type: 'connected',",
    `    agent: '${manifest.name}',`,
    `    version: '${manifest.version}',`,
    `    capabilities: [${capabilitiesList.join(", ")}],`,
    "    loaded: Object.keys(capabilityHandlers),",
    "  }));",
    "});",
    "",
    "// ── REST health check ───────────────────────────────────────────────────",
    "",
    "app.get('/health', (_req, res) => {",
    "  res.json({",
    "    status: 'ok',",
    `    agent: '${manifest.name}',`,
    `    version: '${manifest.version}',`,
    `    websocket: '${wsPath}',`,
    "    loaded: Object.keys(capabilityHandlers),",
    "  });",
    "});",
    "",
    "// ── Start ────────────────────────────────────────────────────────────────",
    "",
    "const PORT = process.env.PORT || 3000;",
    "",
    "preloadCapabilities().then(() => {",
    "  app.listen(PORT, () => {",
    `    console.log('🚀 ${manifest.name} WebSocket running on ws://localhost:' + PORT + '${wsPath}');`,
    "    console.log('   Health check: http://localhost:' + PORT + '/health');",
    "    console.log('   Loaded capabilities: ' + (Object.keys(capabilityHandlers).join(', ') || 'none (using stubs)'));",
    "  });",
    "});",
  ].join("\n");

  writeFileSync(join(wsDir, "server.ts"), serverCode);

  // Generate package.json
  const pkgCode = loadTemplate("package.json.template", {
    agentKebabName: manifest.name.replace(/_/g, "-").toLowerCase(),
    agentName: manifest.name,
    version: manifest.version,
  }, "ws");

  writeFileSync(join(wsDir, "package.json"), pkgCode);

  // Generate README
  const readmeCode = generateReadme(manifest, wsPath);
  writeFileSync(join(wsDir, "README.md"), readmeCode);

  console.log(`  ✅ WebSocket Server generated in ${wsDir}/`);
  console.log(`     • server.ts — Express-WS app with ${manifest.capabilities.length} message handlers`);
  console.log(`     • package.json — dependencies`);
  console.log(`     • README.md — usage instructions`);
}

function generateReadme(manifest: AgentManifest, wsPath: string): string {
  let capabilityDocs = "";
  for (const cap of manifest.capabilities) {
    capabilityDocs += `### ${cap.id}\n\n${cap.description || cap.name}\n\n**Request:**\n\n\`\`\`json\n{ "type": "call", "id": "${cap.id}", "payload": ${JSON.stringify(generateExample(cap.inputSchema), null, 2)} }\n\`\`\`\n\n**Response:**\n\n\`\`\`json\n{ "type": "result", "id": "${cap.id}", "payload": ${JSON.stringify(generateExample(cap.outputSchema), null, 2)} }\n\`\`\`\n\n`;
  }

  return `# ${manifest.displayName || manifest.name} WebSocket Server

> Auto-generated from AgentPackager

## Quick Start

\`\`\`bash
cd ws/
npm install
npm run dev
\`\`\`

Server starts on ws://localhost:3000${wsPath}

## Protocol

### Message Format

**Client → Server:**
\`\`\`json
{ "type": "call", "id": "capability-id", "payload": { ... } }
\`\`\`

**Server → Client (success):**
\`\`\`json
{ "type": "result", "id": "capability-id", "payload": { ... }, "timestamp": "2026-05-23T10:00:00.000Z" }
\`\`\`

**Server → Client (error):**
\`\`\`json
{ "type": "error", "id": "capability-id", "error": "Error message" }
\`\`\`

### Welcome Message (on connect)

\`\`\`json
{ "type": "connected", "agent": "${manifest.name}", "version": "${manifest.version}", "capabilities": [...] }
\`\`\`

## Capabilities

${capabilityDocs}

## Health Check

HTTP GET http://localhost:3000/health
`;
}