import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { AgentManifest } from "../core/types.js";
import { loadTemplate, toCamelCase, toRoutePath, schemaToInterface, generateExample, formatTsObject } from "./utils.js";

/**
 * Generate Express.js REST API from Agent Manifest
 */
export function generateRestAPI(manifest: AgentManifest, outputDir: string): void {
  const routesDir = join(outputDir, "rest");
  mkdirSync(routesDir, { recursive: true });

  // Generate capability handlers
  const imports: string[] = [];
  const routes: string[] = [];
  const interfaces: string[] = [];
  const capabilitiesList: string[] = [];

  for (const cap of manifest.capabilities) {
    const capId = cap.id;
    const capCamel = toCamelCase(capId);
    const routePath = toRoutePath(capId);
    const inputInterface = `${capCamel}Input`;
    const outputInterface = `${capCamel}Output`;

    imports.push(capCamel);
    capabilitiesList.push(`"${capId}"`);

    // Generate TypeScript interfaces
    interfaces.push(`// ${cap.name}`);
    interfaces.push(schemaToInterface(inputInterface, cap.inputSchema));
    interfaces.push("");
    interfaces.push(schemaToInterface(outputInterface, cap.outputSchema));
    interfaces.push("");

    // Generate route
    const exampleOutput = generateExample(cap.outputSchema);
    const outputLines = formatTsObject(exampleOutput, 4);

    const routeTemplate = loadTemplate("route.ts.template", {
      capabilityId: cap.id,
      capabilityName: cap.name,
      capabilityDescription: cap.description || "",
      basePath: manifest.protocols?.rest?.basePath || "/api/v1",
      routePath,
      handlerName: capCamel,
      inputInterface,
      outputInterface,
      outputExample: outputLines,
    });

    routes.push(routeTemplate);
  }

  // Generate server.ts
  const allowedOrigins = manifest.protocols?.rest?.cors?.allowedOrigins
    ? JSON.stringify(manifest.protocols.rest.cors.allowedOrigins)
    : '"*"';

  const serverCode = loadTemplate("server.ts.template", {
    agentName: manifest.name,
    version: manifest.version,
    description: manifest.description || "",
    basePath: manifest.protocols?.rest?.basePath || "/api/v1",
    allowedOrigins,
    capabilitiesList: capabilitiesList.join(", "),
    imports: imports.join(", "),
    routes: routes.join("\n\n"),
  });

  writeFileSync(join(routesDir, "server.ts"), serverCode);

  // Generate types.ts with all interfaces
  const typesCode = [
    "// Auto-generated TypeScript interfaces from agent manifest",
    "",
    ...interfaces,
  ].join("\n");

  writeFileSync(join(routesDir, "types.ts"), typesCode);

  // Generate package.json
  const pkgCode = loadTemplate("package.json.template", {
    agentKebabName: manifest.name.replace(/_/g, "-").toLowerCase(),
    agentName: manifest.name,
    version: manifest.version,
  });

  writeFileSync(join(routesDir, "package.json"), pkgCode);

  // Generate README
  const readmeCode = generateReadme(manifest);
  writeFileSync(join(routesDir, "README.md"), readmeCode);

  console.log(`  ✅ REST API generated in ${routesDir}/`);
  console.log(`     • server.ts — Express app with ${manifest.capabilities.length} routes`);
  console.log(`     • types.ts — TypeScript interfaces`);
  console.log(`     • package.json — dependencies`);
  console.log(`     • README.md — usage instructions`);
}

function generateReadme(manifest: AgentManifest): string {
  const basePath = manifest.protocols?.rest?.basePath || "/api/v1";

  let endpoints = "";
  for (const cap of manifest.capabilities) {
    endpoints += `\n### POST ${basePath}${toRoutePath(cap.id)}\n\n${cap.description}\n\n**Request Body:**\n\n\`\`\`json\n${JSON.stringify(generateExample(cap.inputSchema), null, 2)}\n\`\`\`\n\n**Response:**\n\n\`\`\`json\n${JSON.stringify(generateExample(cap.outputSchema), null, 2)}\n\`\`\`\n`;
  }

  return `# ${manifest.displayName || manifest.name} REST API

> Auto-generated from AgentPackager

## Quick Start

\`\`\`bash
cd rest/
npm install
npm run dev
\`\`\`

Server starts on http://localhost:3000

## API Endpoints

### GET ${basePath}

Get agent info and available capabilities.

### GET /health

Health check endpoint.
${endpoints}

## Authentication

This API uses \`${manifest.security?.authentication?.methods?.join(" / ") || "API key"}\` authentication.

## Rate Limits

- ${manifest.security?.rateLimit?.requestsPerMinute || 60} requests/minute
- ${manifest.security?.rateLimit?.requestsPerHour || 1000} requests/hour

## Security

- Sandbox: ${manifest.security?.sandbox?.type || "none"}
- Network: ${manifest.security?.sandbox?.network || "unrestricted"}
- Encryption: ${manifest.security?.dataProtection?.encryption || "none"}
`;
}
