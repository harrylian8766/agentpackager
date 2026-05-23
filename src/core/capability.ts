/**
 * AgentPackager Capability Interface
 *
 * Implement your business logic in src/capabilities/{capabilityId}.ts
 * Each file must export a default async function.
 */

export type CapabilityInput = Record<string, unknown>;
export type CapabilityOutput = Record<string, unknown>;

/**
 * Capability handler signature.
 *
 * @param input — validated input matching the manifest's inputSchema
 * @returns output matching the manifest's outputSchema
 */
export type CapabilityHandler = (
  input: CapabilityInput
) => Promise<CapabilityOutput> | CapabilityOutput;

/**
 * Example implementation:
 *
 * ```ts
 * // src/capabilities/greet.ts
 * export default async function greet(input: { name?: string }) {
 *   return { message: `Hello, ${input.name || "World"}!` };
 * }
 * ```
 */
