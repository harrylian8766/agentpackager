import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { AgentManifest, ValidationResult, ValidationError } from "./types.js";

const SCHEMA_PATH = new URL("../../schemas/agent-manifest-v1.json", import.meta.url);

export class ManifestValidator {
  private ajv: Ajv;
  private validate: ReturnType<Ajv["compile"]>;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);

    const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf-8"));
    this.validate = this.ajv.compile(schema);
  }

  validate(manifest: unknown): ValidationResult {
    const valid = this.validate(manifest) as boolean;
    const errors: ValidationError[] = [];

    if (!valid && this.validate.errors) {
      for (const err of this.validate.errors) {
        const path = err.instancePath || "/";
        errors.push({
          path,
          message: err.message || "Unknown error",
        });
      }
    }

    // Custom business rules beyond JSON Schema
    if (typeof manifest === "object" && manifest !== null) {
      const m = manifest as AgentManifest;
      errors.push(...this.runCustomRules(m));
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private runCustomRules(m: AgentManifest): ValidationError[] {
    const errors: ValidationError[] = [];

    // Capability IDs must be unique
    const ids = new Set<string>();
    for (const cap of m.capabilities || []) {
      if (ids.has(cap.id)) {
        errors.push({
          path: `/capabilities/${cap.id}`,
          message: `Duplicate capability ID: "${cap.id}"`,
        });
      }
      ids.add(cap.id);
    }

    // Docker image required when sandbox type is docker
    if (m.runtime?.type === "docker" && !m.runtime.image) {
      errors.push({
        path: "/runtime/image",
        message: "runtime.image is required when runtime.type is 'docker'",
      });
    }

    // Allowed domains only valid when network=restricted
    const sandbox = m.security?.sandbox;
    if (sandbox?.allowedDomains && sandbox.network !== "restricted") {
      errors.push({
        path: "/security/sandbox/allowedDomains",
        message: "allowedDomains only applies when network='restricted'",
      });
    }

    // At least one protocol must be enabled
    const protocols = m.protocols || {};
    const anyEnabled =
      protocols.rest?.enabled !== false ||
      protocols.mcp?.enabled !== false ||
      protocols.websocket?.enabled === true ||
      protocols.webhook?.enabled === true;

    if (!anyEnabled) {
      errors.push({
        path: "/protocols",
        message: "At least one protocol must be enabled",
      });
    }

    return errors;
  }
}
