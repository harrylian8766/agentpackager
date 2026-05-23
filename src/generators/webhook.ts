import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { AgentManifest } from "../core/types.js";
import { loadTemplate, toCamelCase, generateExample, formatTsObject } from "./utils.js";

/**
 * Generate Webhook Server from Agent Manifest
 * 
 * Webhooks are event-driven HTTP callbacks. Each capability maps to a
 * POST endpoint that triggers business logic and optionally forwards
 * results to registered callback URLs.
 */
export function generateWebhook(manifest: AgentManifest, outputDir: string): void {
  const webhookDir = join(outputDir, "webhook");
  mkdirSync(webhookDir, { recursive: true });

  const basePath = manifest.protocols?.webhook?.basePath || "/webhooks";
  const secretHeader = manifest.protocols?.webhook?.secretHeader || "X-Webhook-Secret";

  // Generate capability stubs
  const stubs: string[] = [];
  const routes: string[] = [];
  const capabilitiesList: string[] = [];

  for (const cap of manifest.capabilities) {
    const capId = cap.id;
    const capCamel = toCamelCase(capId);
    const routePath = toWebhookPath(capId);
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

    // Generate route
    routes.push(`// ── ${capId} ───────────────────────────────────────────────────────────────

app.post('${routePath}', async (req, res) => {
  const { payload, callbackUrl } = req.body;

  // Verify secret
  const secret = req.headers['${secretHeader.toLowerCase()}'];
  if (!secret || !isValidSecret(secret)) {
    return res.status(401).json({ error: 'Invalid or missing webhook secret' });
  }

  try {
    const handler = capabilityHandlers['${capId}'];
    const result = handler ? await handler(payload) : await ${capCamel}Stub(payload);

    // If callbackUrl provided, send result asynchronously
    if (callbackUrl && typeof callbackUrl === 'string') {
      sendCallback(callbackUrl, '${capId}', result).catch(console.error);
    }

    res.json({
      success: true,
      id: '${capId}',
      payload: result,
      timestamp: new Date().toISOString(),
      callbackSent: !!callbackUrl,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      id: '${capId}',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});`);
  }

  // Build server code
  const serverCode = [
    "import express from 'express';",
    "import { readdirSync, existsSync } from 'node:fs';",
    "import { join } from 'node:path';",
    "",
    "const app = express();",
    "app.use(express.json());",
    "",
    "// ── Configuration ────────────────────────────────────────────────────────",
    "",
    `const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'change-me-in-production';`,
    `const PORT = process.env.PORT || 3000;`,
    "",
    "function isValidSecret(secret: string): boolean {",
    "  return secret === WEBHOOK_SECRET;",
    "}",
    "",
    "async function sendCallback(url: string, id: string, payload: any): Promise<void> {",
    "  try {",
    "    const response = await fetch(url, {",
    "      method: 'POST',",
    "      headers: { 'Content-Type': 'application/json' },",
    "      body: JSON.stringify({",
    "        type: 'callback',",
    "        id,",
    "        payload,",
    "        timestamp: new Date().toISOString(),",
    "      }),",
    "    });",
    "    if (!response.ok) {",
    "      console.error(`[webhook] callback failed: ${response.status} ${response.statusText}`);",
    "    }",
    "  } catch (err: any) {",
    "    console.error(`[webhook] callback error: ${err.message}`);",
    "  }",
    "}",
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
    "// ── Webhook Routes ───────────────────────────────────────────────────────",
    "",
    ...routes,
    "",
    "// ── Health & Info ────────────────────────────────────────────────────────",
    "",
    `app.get('${basePath}', (_req, res) => {`,
    "  res.json({",
    `    agent: '${manifest.name}',`,
    `    version: '${manifest.version}',`,
    `    basePath: '${basePath}',`,
    `    capabilities: [${capabilitiesList.join(", ")}],`,
    "    loaded: Object.keys(capabilityHandlers),",
    "    endpoints: [",
    ...manifest.capabilities.map(cap =>
      `      { id: '${cap.id}', method: 'POST', path: '${toWebhookPath(cap.id)}' }`
    ),
    "    ]",
    "  });",
    "});",
    "",
    "app.get('/health', (_req, res) => {",
    "  res.json({ status: 'ok', agent: '${manifest.name}', loaded: Object.keys(capabilityHandlers) });",
    "});",
    "",
    "// ── Start ────────────────────────────────────────────────────────────────",
    "",
    "preloadCapabilities().then(() => {",
    "  app.listen(PORT, () => {",
    `    console.log('🚀 ${manifest.name} Webhook running on http://localhost:' + PORT + '${basePath}');`,
    "    console.log('   Loaded capabilities: ' + (Object.keys(capabilityHandlers).join(', ') || 'none (using stubs)'));",
    "  });",
    "});",
  ].join("\n");

  writeFileSync(join(webhookDir, "server.ts"), serverCode);

  // Generate package.json
  const pkgCode = loadTemplate("package.json.template", {
    agentKebabName: manifest.name.replace(/_/g, "-").toLowerCase(),
    agentName: manifest.name,
    version: manifest.version,
  }, "webhook");

  writeFileSync(join(webhookDir, "package.json"), pkgCode);

  // Generate README
  const readmeCode = generateReadme(manifest, basePath, secretHeader);
  writeFileSync(join(webhookDir, "README.md"), readmeCode);

  console.log(`  ✅ Webhook Server generated in ${webhookDir}/`);
  console.log(`     • server.ts — Express app with ${manifest.capabilities.length} webhook endpoints`);
  console.log(`     • package.json — dependencies`);
  console.log(`     • README.md — usage instructions`);
}

function toWebhookPath(capabilityId: string): string {
  return "/" + capabilityId.replace(/_/g, "-").toLowerCase();
}

function generateReadme(manifest: AgentManifest, basePath: string, secretHeader: string): string {
  let endpointDocs = "";
  for (const cap of manifest.capabilities) {
    endpointDocs += `### POST ${basePath}${toWebhookPath(cap.id)}

${cap.description || cap.name}

**Headers:**
\`\`\`
${secretHeader}: your-webhook-secret
Content-Type: application/json
\`\`\`

**Body:**
\`\`\`json
{
  "payload": ${JSON.stringify(generateExample(cap.inputSchema), null, 2)},
  "callbackUrl": "https://your-app.com/callbacks/${cap.id}"
}
\`\`\`

**Response (success):**
\`\`\`json
{
  "success": true,
  "id": "${cap.id}",
  "payload": ${JSON.stringify(generateExample(cap.outputSchema), null, 2)},
  "timestamp": "2026-05-23T10:00:00.000Z",
  "callbackSent": true
}
\`\`\`

**Response (error):**
\`\`\`json
{
  "success": false,
  "id": "${cap.id}",
  "error": "Error message",
  "timestamp": "2026-05-23T10:00:00.000Z"
}
\`\`\`

`;
  }

  return [
    `# ${manifest.displayName || manifest.name} Webhook Server`,
    "",
    "> Auto-generated from AgentPackager",
    "",
    "## Quick Start",
    "",
    "```bash",
    "cd webhook/",
    "npm install",
    "WEBHOOK_SECRET=your-secret npm run dev",
    "```",
    "",
    `Server starts on http://localhost:3000${basePath}`,
    "",
    "## Authentication",
    "",
    "All webhook endpoints require the secret header:",
    "",
    "```",
    `${secretHeader}: your-webhook-secret`,
    "```",
    "",
    "Set via environment variable:",
    "```bash",
    "export WEBHOOK_SECRET=your-secret",
    "```",
    "",
    "## Protocol",
    "",
    "### Request Format",
    "",
    "```json",
    `{\n  "payload": { ... },\n  "callbackUrl": "https://your-app.com/callback"\n}`,
    "```",
    "",
    "### Response Format",
    "",
    "**Success:**",
    "```json",
    `{ "success": true, "id": "capability-id", "payload": { ... }, "timestamp": "...", "callbackSent": true }`,
    "```",
    "",
    "**Error:**",
    "```json",
    `{ "success": false, "id": "capability-id", "error": "...", "timestamp": "..." }`,
    "```",
    "",
    "### Callbacks",
    "",
    "If callbackUrl is provided, the server will POST the result asynchronously:",
    "",
    "```json",
    `{ "type": "callback", "id": "capability-id", "payload": { ... }, "timestamp": "..." }`,
    "```",
    "",
    "## Endpoints",
    "",
    endpointDocs,
    "",
    "## Health Check",
    "",
    "GET http://localhost:3000/health",
    "",
    "## Info",
    "",
    `GET http://localhost:3000${basePath} — List all endpoints`,
  ].join("\n");
}
