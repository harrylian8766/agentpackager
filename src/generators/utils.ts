import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load a template file and replace placeholders
 */
export function loadTemplate(name: string, replacements: Record<string, string>): string {
  const templatePath = join(__dirname, "../../templates/rest", name);
  let content = readFileSync(templatePath, "utf-8");

  for (const [key, value] of Object.entries(replacements)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }

  return content;
}

/**
 * Convert kebab-case/PascalCase to camelCase
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
    .replace(/^./, (char) => char.toLowerCase());
}

/**
 * Convert capability ID to Express route path
 * e.g. "analyze_stock" -> "/analyze-stock"
 */
export function toRoutePath(id: string): string {
  return "/" + id.replace(/_/g, "-");
}

/**
 * Generate TypeScript interface from JSON Schema properties
 */
export function schemaToInterface(name: string, schema: Record<string, unknown>): string {
  if (!schema || typeof schema !== "object") return `export interface ${name} {}`;

  const props = (schema.properties || {}) as Record<string, Record<string, unknown>>;
  const required = (schema.required || []) as string[];

  let lines = [`export interface ${name} {`];

  for (const [key, prop] of Object.entries(props)) {
    const isRequired = required.includes(key);
    const type = jsonSchemaTypeToTs(prop);
    const optional = isRequired ? "" : "?";
    const description = prop.description ? ` // ${prop.description}` : "";
    lines.push(`  ${key}${optional}: ${type};${description}`);
  }

  lines.push("}");
  return lines.join("\n");
}

function jsonSchemaTypeToTs(prop: Record<string, unknown>): string {
  const type = prop.type as string;

  switch (type) {
    case "string":
      if (prop.enum) {
        return (prop.enum as string[]).map((v) => `"${v}"`).join(" | ");
      }
      return "string";
    case "integer":
      return "number";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "array":
      const items = prop.items as Record<string, unknown>;
      if (items) {
        return `${jsonSchemaTypeToTs(items)}[]`;
      }
      return "unknown[]";
    case "object":
      // Inline object type
      const subProps = (prop.properties || {}) as Record<string, Record<string, unknown>>;
      const subRequired = (prop.required || []) as string[];
      const subLines: string[] = [];
      for (const [k, v] of Object.entries(subProps)) {
        const opt = subRequired.includes(k) ? "" : "?";
        subLines.push(`${k}${opt}: ${jsonSchemaTypeToTs(v)}`);
      }
      return `{ ${subLines.join("; ")} }`;
    default:
      return "unknown";
  }
}

/**
 * Generate default value for testing from schema
 */
export function generateExample(schema: Record<string, unknown>): Record<string, unknown> {
  const props = (schema.properties || {}) as Record<string, Record<string, unknown>>;
  const result: Record<string, unknown> = {};

  for (const [key, prop] of Object.entries(props)) {
    const type = prop.type as string;
    const hasDefault = prop.default !== undefined;

    if (hasDefault) {
      result[key] = prop.default;
      continue;
    }

    switch (type) {
      case "string":
        if (prop.enum) {
          result[key] = (prop.enum as string[])[0];
        } else if (key.includes("id") || key.includes("code")) {
          result[key] = "example-123";
        } else {
          result[key] = `Hello ${key}`;
        }
        break;
      case "integer":
      case "number":
        result[key] = 42;
        break;
      case "boolean":
        result[key] = true;
        break;
      case "array":
        result[key] = [];
        break;
      case "object":
        result[key] = generateExample(prop);
        break;
    }
  }

  return result;
}

/**
 * Format a plain object as TypeScript object literal (not JSON)
 * Removes outer braces and quotes keys only when necessary
 */
export function formatTsObject(obj: Record<string, unknown>, indent: number): string {
  const spaces = " ".repeat(indent);
  const entries = Object.entries(obj);
  
  if (entries.length === 0) return "{}";
  
  const lines = entries.map(([key, value]) => {
    const formattedValue = formatTsValue(value, indent + 2);
    return `${spaces}${key}: ${formattedValue}`;
  });
  
  return lines.join(",\n");
}

function formatTsValue(value: unknown, indent: number): string {
  if (value === null) return "null";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.map((v) => formatTsValue(v, indent)).join(", ");
    return `[${items}]`;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const entries = Object.entries(obj);
    if (entries.length === 0) return "{}";
    const spaces = " ".repeat(indent);
    const lines = entries.map(([k, v]) => {
      return `${spaces}  ${k}: ${formatTsValue(v, indent + 2)}`;
    });
    return `{\n${lines.join(",\n")}\n${spaces}}`;
  }
  return String(value);
}
