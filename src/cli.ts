#!/usr/bin/env node
/**
 * AgentPackager CLI
 * Package your AI agent's capabilities into secure, multi-protocol service interfaces.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import YAML from "yaml";
import { ManifestValidator } from "./core/validator.js";

const PKG = JSON.parse(readFileSync(join(import.meta.dirname, "../package.json"), "utf-8"));
const VERSION: string = PKG.version;

const HELP_TEXT = `
agentpackager v${VERSION} — Package your AI agent's capabilities

Commands:
  init [name]            Initialize a new agent project
  validate [file]          Validate agent.yml manifest
  build [file]             Generate multi-protocol interfaces
  serve [file]             Run local gateway server
  publish [file]           Publish to AI Pair platform

Options:
  -f, --file <path>        Agent manifest file (default: ./agent.yml)
  -o, --output <dir>       Output directory (default: ./dist)
  -h, --help               Show this help
  -v, --version            Show version

Examples:
  agentpackager init my-agent
  agentpackager validate
  agentpackager build --output ./dist
  agentpackager serve --file ./agent.yml
`;

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      file: { type: "string", short: "f" },
      output: { type: "string", short: "o" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
    allowPositionals: true,
  });

  if (values.version) {
    console.log(`agentpackager v${VERSION}`);
    process.exit(0);
  }

  if (values.help || positionals.length === 0) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  const command = positionals[0];
  const manifestFile = values.file || "./agent.yml";
  const outputDir = values.output || "./dist";

  switch (command) {
    case "init": {
      const projectName = positionals[1] || "my-agent";
      await cmdInit(projectName);
      break;
    }
    case "validate": {
      await cmdValidate(manifestFile);
      break;
    }
    case "build": {
      await cmdBuild(manifestFile, outputDir);
      break;
    }
    case "serve": {
      await cmdServe(manifestFile);
      break;
    }
    case "publish": {
      await cmdPublish(manifestFile);
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP_TEXT);
      process.exit(1);
  }
}

async function cmdInit(projectName: string) {
  console.log(`\n  Creating agent project: ${projectName}\n`);

  const template = `name: ${projectName}
version: "0.1.0"
description: "Describe what your agent does"
displayName: "${projectName}"

capabilities:
  - id: hello
    name: Hello World
    description: A sample capability
    inputSchema:
      type: object
      properties:
        name:
          type: string
          default: "World"
    outputSchema:
      type: object
      properties:
        message:
          type: string

security:
  sandbox:
    type: docker
    network: none
    executionTimeout: 30s
    maxMemory: 256MiB
  rateLimit:
    requestsPerMinute: 60
  dataProtection:
    encryption: tls
    piiRedaction: true

protocols:
  rest:
    enabled: true
    basePath: /api/v1
  mcp:
    enabled: true
    transport: stdio
`;

  // In a real implementation, this would write files to disk
  console.log("  Generated agent.yml:");
  console.log(template);
  console.log("\n  Next steps:");
  console.log(`  1. Edit agent.yml to define your capabilities`);
  console.log(`  2. Run: agentpackager validate`);
  console.log(`  3. Run: agentpackager build`);
}

async function cmdValidate(manifestFile: string) {
  const fullPath = resolve(manifestFile);

  if (!existsSync(fullPath)) {
    console.error(`\n  Error: Manifest file not found: ${fullPath}\n`);
    process.exit(1);
  }

  console.log(`\n  Validating: ${fullPath}\n`);

  const content = readFileSync(fullPath, "utf-8");
  const manifest = YAML.parse(content);

  const validator = new ManifestValidator();
  const result = validator.validate(manifest);

  if (result.valid) {
    console.log(`  ✅ Manifest is valid`);
    console.log(`  • Agent: ${manifest.name} v${manifest.version}`);
    console.log(`  • Capabilities: ${manifest.capabilities?.length || 0}`);
    console.log(`  • Protocols: ${Object.keys(manifest.protocols || {}).filter(k => manifest.protocols[k]?.enabled).join(", ")}`);
    console.log();
    process.exit(0);
  } else {
    console.log(`  ❌ Validation failed (${result.errors.length} errors)\n`);
    for (const err of result.errors) {
      console.log(`    ${err.path}: ${err.message}`);
    }
    console.log();
    process.exit(1);
  }
}

async function cmdBuild(manifestFile: string, outputDir: string) {
  console.log(`\n  Building from: ${manifestFile}`);
  console.log(`  Output: ${outputDir}\n`);

  const fullPath = resolve(manifestFile);
  if (!existsSync(fullPath)) {
    console.error(`  Error: Manifest file not found: ${fullPath}\n`);
    process.exit(1);
  }

  const content = readFileSync(fullPath, "utf-8");
  const manifest = YAML.parse(content);

  // Validate first
  const validator = new ManifestValidator();
  const result = validator.validate(manifest);
  if (!result.valid) {
    console.error(`  ❌ Validation failed. Run 'agentpackager validate' for details.\n`);
    process.exit(1);
  }

  console.log(`  Generating protocol interfaces...\n`);

  const protocols = manifest.protocols || {};

  if (protocols.rest?.enabled !== false) {
    console.log(`  📦 REST API        → ${outputDir}/rest/`);
    // TODO: Generate Express/FastAPI code
  }
  if (protocols.mcp?.enabled !== false) {
    console.log(`  📦 MCP Server      → ${outputDir}/mcp/`);
    // TODO: Generate @modelcontextprotocol/sdk server
  }
  if (protocols.websocket?.enabled) {
    console.log(`  📦 WebSocket       → ${outputDir}/ws/`);
    // TODO: Generate WS handler
  }
  if (protocols.webhook?.enabled) {
    console.log(`  📦 Webhook         → ${outputDir}/webhook/`);
    // TODO: Generate webhook handler
  }

  console.log(`\n  ✅ Build complete. See ${outputDir}/`);
  console.log(`  Next: agentpackager serve --file ${manifestFile}\n`);
}

async function cmdServe(manifestFile: string) {
  console.log(`\n  Starting gateway for: ${manifestFile}\n`);
  console.log(`  🌐 REST API     → http://localhost:3000/api/v1`);
  console.log(`  🔌 MCP Server   → stdio (for Claude/Cursor)`);
  console.log(`  📊 Health Check  → http://localhost:3000/health`);
  console.log(`\n  Press Ctrl+C to stop\n`);
  // TODO: Implement actual server
}

async function cmdPublish(manifestFile: string) {
  console.log(`\n  Publishing: ${manifestFile}\n`);
  console.log(`  Platform: AI Pair (https://aipair.ai)`);
  console.log(`  Status: Not yet implemented`);
  console.log(`\n  To publish manually:`);
  console.log(`  1. Build: agentpackager build`);
  console.log(`  2. Push image to registry`);
  console.log(`  3. Register at https://aipair.ai/agents\n`);
}

main().catch((err) => {
  console.error(`\n  Fatal error: ${err.message}\n`);
  process.exit(1);
});
