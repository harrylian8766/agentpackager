// AgentPackager Manifest TypeScript Types
// Mirror of schemas/agent-manifest-v1.json

export interface AgentManifest {
  name: string;
  displayName?: string;
  description?: string;
  version: string;
  author?: AgentAuthor;
  icon?: string;
  license?: string;
  repository?: string;
  tags?: string[];
  capabilities: Capability[];
  security?: SecurityConfig;
  runtime?: RuntimeConfig;
  protocols?: ProtocolsConfig;
  platforms?: PlatformsConfig;
}

export interface AgentAuthor {
  name?: string;
  email?: string;
  url?: string;
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema object
  outputSchema: Record<string, unknown>; // JSON Schema object
  examples?: CapabilityExample[];
}

export interface CapabilityExample {
  input: unknown;
  output: unknown;
}

export interface SecurityConfig {
  sandbox?: SandboxConfig;
  rateLimit?: RateLimitConfig;
  dataProtection?: DataProtectionConfig;
  authentication?: AuthConfig;
}

export interface SandboxConfig {
  type: "docker" | "gvisor" | "firecracker" | "wasm" | "process";
  network?: "none" | "restricted" | "full";
  allowedDomains?: string[];
  filesystem?: "none" | "readonly" | "ephemeral" | "full";
  executionTimeout?: string; // e.g. "30s"
  maxMemory?: string; // e.g. "512MiB"
  maxCpu?: string; // e.g. "1"
}

export interface RateLimitConfig {
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  concurrentRequests?: number;
}

export interface DataProtectionConfig {
  inputLogging?: boolean;
  outputLogging?: boolean;
  piiRedaction?: boolean;
  encryption?: "none" | "tls" | "e2e";
}

export interface AuthConfig {
  methods?: ("api_key" | "oauth2" | "jwt" | "pairing")[];
  apiKeyRotation?: boolean;
  autoAcceptPairing?: boolean;
}

export interface RuntimeConfig {
  type?: "docker" | "binary" | "python" | "node" | "wasm";
  image?: string;
  command?: string;
  env?: EnvVar[];
  volumes?: Volume[];
  healthCheck?: HealthCheckConfig;
}

export interface EnvVar {
  name: string;
  value?: string;
  secret?: boolean;
}

export interface Volume {
  host: string;
  container: string;
  readonly?: boolean;
}

export interface HealthCheckConfig {
  path?: string;
  interval?: string;
  timeout?: string;
}

export interface ProtocolsConfig {
  rest?: RestConfig;
  mcp?: McpConfig;
  websocket?: WebSocketConfig;
  webhook?: WebhookConfig;
}

export interface RestConfig {
  enabled?: boolean;
  basePath?: string;
  cors?: CorsConfig;
}

export interface CorsConfig {
  enabled?: boolean;
  allowedOrigins?: string[];
}

export interface McpConfig {
  enabled?: boolean;
  serverName?: string;
  transport?: "stdio" | "http" | "sse";
}

export interface WebSocketConfig {
  enabled?: boolean;
  path?: string;
}

export interface WebhookConfig {
  enabled?: boolean;
  basePath?: string;
  secretHeader?: string;
  events?: string[];
}

export interface PlatformsConfig {
  aiPair?: AiPairConfig;
  discord?: DiscordConfig;
  telegram?: TelegramConfig;
  feishu?: FeishuConfig;
}

export interface AiPairConfig {
  enabled?: boolean;
  endpoint?: string;
}

export interface DiscordConfig {
  enabled?: boolean;
}

export interface TelegramConfig {
  enabled?: boolean;
}

export interface FeishuConfig {
  enabled?: boolean;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
}
