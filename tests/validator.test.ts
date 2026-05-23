import { describe, it } from "node:test";
import assert from "node:assert";
import { ManifestValidator } from "../src/core/validator.js";

describe("ManifestValidator", () => {
  const validator = new ManifestValidator();

  describe("basic validation", () => {
    it("should pass a valid hello-world manifest", () => {
      const manifest = {
        name: "hello-world",
        version: "1.0.0",
        description: "A minimal example",
        capabilities: [
          {
            id: "greet",
            name: "Greet",
            description: "Say hello",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string", default: "World" },
              },
            },
            outputSchema: {
              type: "object",
              properties: {
                message: { type: "string" },
              },
              required: ["message"],
            },
          },
        ],
        security: {
          sandbox: {
            type: "docker",
            network: "none",
            executionTimeout: "5s",
            maxMemory: "64MiB",
          },
          rateLimit: {
            requestsPerMinute: 60,
          },
        },
        protocols: {
          rest: { enabled: true, basePath: "/api/v1" },
          mcp: { enabled: true, transport: "stdio" },
        },
      };

      const result = validator.validate(manifest);
      assert.strictEqual(result.valid, true);
      assert.deepStrictEqual(result.errors, []);
    });

    it("should fail without required fields", () => {
      const result = validator.validate({});
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length > 0);
    });

    it("should fail with invalid version format", () => {
      const manifest = {
        name: "test",
        version: "not-semver",
        capabilities: [],
      };
      const result = validator.validate(manifest);
      assert.strictEqual(result.valid, false);
    });
  });

  describe("custom rules", () => {
    it("should detect duplicate capability IDs", () => {
      const manifest = {
        name: "test",
        version: "1.0.0",
        capabilities: [
          {
            id: "greet",
            name: "Greet",
            description: "Say hello",
            inputSchema: { type: "object", properties: {} },
            outputSchema: { type: "object", properties: {} },
          },
          {
            id: "greet",
            name: "Greet2",
            description: "Say hello again",
            inputSchema: { type: "object", properties: {} },
            outputSchema: { type: "object", properties: {} },
          },
        ],
      };

      const result = validator.validate(manifest);
      assert.strictEqual(result.valid, false);
      const dupError = result.errors.find((e) => e.message.includes("Duplicate"));
      assert.ok(dupError, "Should have duplicate capability error");
    });

    it("should require docker image when runtime.type=docker", () => {
      const manifest = {
        name: "test",
        version: "1.0.0",
        capabilities: [
          {
            id: "hello",
            name: "Hello",
            description: "Say hello",
            inputSchema: { type: "object", properties: {} },
            outputSchema: { type: "object", properties: {} },
          },
        ],
        runtime: {
          type: "docker",
        },
      };

      const result = validator.validate(manifest);
      assert.strictEqual(result.valid, false);
      const imageError = result.errors.find((e) =>
        e.message.includes("runtime.image is required")
      );
      assert.ok(imageError, "Should require docker image");
    });

    it("should require at least one protocol", () => {
      const manifest = {
        name: "test",
        version: "1.0.0",
        capabilities: [
          {
            id: "hello",
            name: "Hello",
            description: "Say hello",
            inputSchema: { type: "object", properties: {} },
            outputSchema: { type: "object", properties: {} },
          },
        ],
        protocols: {
          rest: { enabled: false },
          mcp: { enabled: false },
        },
      };

      const result = validator.validate(manifest);
      assert.strictEqual(result.valid, false);
      const protocolError = result.errors.find((e) =>
        e.message.includes("At least one protocol")
      );
      assert.ok(protocolError, "Should require at least one protocol");
    });
  });
});
