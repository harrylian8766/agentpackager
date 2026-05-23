#!/usr/bin/env node
/**
 * MCP Server Generator
 * Generates a Model Context Protocol server from Agent Manifest.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { AgentManifest } from "../core/types.js";
import { loadTemplate, toCamelCase, generateExample, formatTsObject } from "./utils.js";

/**
 * Generate MCP Server from Agent Manifest
 */
export function generateMCPServer(manifest: AgentManifest, outputDir: string): void {
  const mcpDir = join(outputDir, "mcp");
  mkdirSync(mcpDir, { recursive: true });

  // Generate tool definitions
  const toolSchemas: string[] = [];
  const toolHandlers: string[] = [];
  const handlerMap: string[] = [];

  for (const cap of manifest.capabilities) {
    const capId = cap.id;
    const capCamel = toCamelCase(capId);

    // Generate Zod schema for tool input
    const zodSchema = jsonSchemaToZod(cap.inputSchema);

    toolSchemas.push(`  {
    name: "${capId}",
    description: "${cap.description || cap.name}",
    inputSchema: ${zodSchema},
  }`);

    // Generate tool handler
    const handlerCode = generateToolHandler(capId, capCamel, cap);
    toolHandlers.push(handlerCode);

    // Handler map entry
    handlerMap.push(`    case "${capId}":\n      return ${capCamel}Handler(args);`);
  }

  // Generate server.ts
  const serverCode = loadTemplate("server.ts.template", {
    agentName: manifest.name,
    version: manifest.version,
    description: manifest.description || "",
    serverName: manifest.protocols?.mcp?.serverName || manifest.name,
    transport: manifest.protocols?.mcp?.transport || "stdio",
    tools: toolSchemas.join(",\n"),
    handlers: toolHandlers.join("\n\n"),
    handlerMap: handlerMap.join("\n"),
  }, "mcp");

  writeFileSync(join(mcpDir, "server.ts"), serverCode);

  // Generate package.json
  const pkgCode = loadTemplate("package.json.template", {
    agentKebabName: manifest.name.replace(/_/g, "-").toLowerCase(),
    agentName: manifest.name,
    version: manifest.version,
  }, "mcp");

  writeFileSync(join(mcpDir, "package.json"), pkgCode);

  // Generate README
  const readmeCode = generateReadme(manifest);
  writeFileSync(join(mcpDir, "README.md"), readmeCode);

  console.log(`  ✅ MCP Server generated in ${mcpDir}/`);
  console.log(`     • server.ts — MCP Server with ${manifest.capabilities.length} tools`);
  console.log(`     • package.json — dependencies`);
  console.log(`     • README.md — usage instructions`);
}

/**
 * Generate a tool handler function
 */
function generateToolHandler(capId: string, capCamel: string, cap: any): string {
  const exampleOutput = generateExample(cap.outputSchema);
  const outputLines = formatTsObject(exampleOutput, 4);

  return `// Tool: ${capId}
// ${cap.description || cap.name}

async function ${capCamel}Handler(args: any) {
  // TODO: Implement your agent logic here
  // Input validation is handled by Zod schema

  const result = await ${capCamel}(args);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

/**
 * ${cap.name} implementation
 */
async function ${capCamel}(input: any): Promise<any> {
  // TODO: Replace this placeholder with your actual implementation
  return {
${outputLines}
  };
}`;
}

/**
 * Convert JSON Schema to Zod schema string
 */
function jsonSchemaToZod(schema: Record<string, unknown>): string {
  if (!schema || typeof schema !== "object") return "z.any()";

  const type = schema.type as string;
  const props = (schema.properties || {}) as Record<string, Record<string, unknown>>;
  const required = (schema.required || []) as string[];

  switch (type) {
    case "object": {
      const fields: string[] = [];
      for (const [key, prop] of Object.entries(props)) {
        const isRequired = required.includes(key);
        const fieldSchema = jsonSchemaTypeToZodField(prop);
        fields.push(`    ${key}: ${fieldSchema}${isRequired ? "" : ".optional()"},`);
      }
      return `z.object({\n${fields.join("\n")}\n  })`;
    }
    default:
      return "z.any()";
  }
}

function jsonSchemaTypeToZodField(prop: Record<string, unknown>): string {
  const type = prop.type as string;

  switch (type) {
    case "string":
      if (prop.enum) {
        const values = (prop.enum as string[]).map((v) => `"${v}"`).join(", ");
        return `z.enum([${values}])`;
      }
      if (prop.pattern) {
        return `z.string().regex(/${prop.pattern}/)`;
      }
      return "z.string()";
    case "integer":
      return "z.number().int()";
    case "number":
      return "z.number()";
    case "boolean":
      return "z.boolean()";
    case "array": {
      const items = prop.items as Record<string, unknown>;
      if (items) {
        return `z.array(${jsonSchemaTypeToZodField(items)})`;
      }
      return "z.array(z.any())";
    }
    case "object":
      return jsonSchemaToZod(prop);
    default:
      return "z.any()";
  }
}

function generateReadme(manifest: AgentManifest): string {
  const transport = manifest.protocols?.mcp?.transport || "stdio";

  let tools = "";
  for (const cap of manifest.capabilities) {
    tools += `### ${cap.id}\n\n${cap.description || cap.name}\n\n**Input:**\n\n\`\`\`json\n${JSON.stringify(generateExample(cap.inputSchema), null, 2)}\n\`\`\`\n\n**Output:**\n\n\`\`\`json\n${JSON.stringify(generateExample(cap.outputSchema), null, 2)}\n\`\`\`\n\n`;
  }

  return `# ${manifest.displayName || manifest.name} MCP Server

> Auto-generated from AgentPackager

## Quick Start

\`\`\`bash
cd mcp/
npm install
npm run dev
\`\`\`

## Usage with Claude Code

\`\`\`bash
# Add to Claude Code MCP config
claude mcp add ${manifest.name} npx tsx $(pwd)/server.ts
\`\`\`

## Usage with Cursor

Add to \`.cursor/mcp.json\`:

\`\`\`json
{
  "mcpServers": {
    "${manifest.name}": {
      "command": "npx",
      "args": ["tsx", "$(pwd)/server.ts"]
    }
  }
}
\`\`\`

## Tools

${tools}

## Transport

- **Type**: ${transport}
- **Supported**: stdio, http, sse

## Security

- Sandbox: ${manifest.security?.sandbox?.type || "none"}
- Encryption: ${manifest.security?.dataProtection?.encryption || "none"}
`;
}
