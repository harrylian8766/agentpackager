/**
 * Example user-implemented capability
 * Place this in src/capabilities/greet.ts
 */

export default async function greet(input: { name?: string }): Promise<{ message: string }> {
  return {
    message: `Hello, ${input.name || "World"}!`,
  };
}
