import { describe, it } from "node:test";
import assert from "node:assert";
import { toCamelCase, toRoutePath, generateExample, formatTsObject } from "../src/generators/utils.js";

describe("Generator Utils", () => {
  describe("toCamelCase", () => {
    it("should convert snake_case to camelCase", () => {
      assert.strictEqual(toCamelCase("analyze_stock"), "analyzeStock");
    });

    it("should convert kebab-case to camelCase", () => {
      assert.strictEqual(toCamelCase("hello-world"), "helloWorld");
    });

    it("should keep camelCase as is", () => {
      assert.strictEqual(toCamelCase("helloWorld"), "helloWorld");
    });
  });

  describe("toRoutePath", () => {
    it("should convert snake_case to kebab path", () => {
      assert.strictEqual(toRoutePath("analyze_stock"), "/analyze-stock");
    });

    it("should handle single words", () => {
      assert.strictEqual(toRoutePath("greet"), "/greet");
    });
  });

  describe("generateExample", () => {
    it("should generate example with string default", () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string", default: "World" },
        },
      };
      const result = generateExample(schema);
      assert.deepStrictEqual(result, { name: "World" });
    });

    it("should generate example with integer", () => {
      const schema = {
        type: "object",
        properties: {
          limit: { type: "integer" },
        },
      };
      const result = generateExample(schema);
      assert.deepStrictEqual(result, { limit: 42 });
    });

    it("should generate example with enum", () => {
      const schema = {
        type: "object",
        properties: {
          signal: { type: "string", enum: ["buy", "sell"] },
        },
      };
      const result = generateExample(schema);
      assert.deepStrictEqual(result, { signal: "buy" });
    });
  });

  describe("formatTsObject", () => {
    it("should format simple object as TypeScript", () => {
      const obj = { message: "Hello" };
      const result = formatTsObject(obj, 4);
      assert.ok(result.includes("message:"));
      assert.ok(result.includes('"Hello"'));
    });

    it("should format nested object", () => {
      const obj = { macd: { dif: -0.71, dea: -0.79 } };
      const result = formatTsObject(obj, 4);
      assert.ok(result.includes("dif:"));
      assert.ok(result.includes("dea:"));
    });
  });
});
