# AgentPackager

> Package your AI agent's capabilities into secure, multi-protocol service interfaces.

## Quick Start (30 seconds)

```bash
# Install
npm install -g agentpackager

# Initialize a project
agentpackager init hello-world

# Validate your manifest
agentpackager validate

# Build all protocol interfaces
agentpackager build

# Run local gateway
agentpackager serve
```

## What is AgentPackager?

A CLI tool that helps developers:
- **Define** agent capabilities in a declarative YAML manifest
- **Generate** REST API, MCP Server, WebSocket, Webhook interfaces
- **Secure** execution with sandbox, rate limiting, and data protection
- **Publish** to AI Pair or any compatible platform

## Example: Hello World

```yaml
# agent.yml
name: hello-world
version: "1.0.0"
description: "A minimal example to get started"

capabilities:
  - id: greet
    name: Greet
    description: Say hello to someone
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
    executionTimeout: 5s

protocols:
  rest:
    enabled: true
  mcp:
    enabled: true
```

See `examples/hello-world/agent.yml` for the full file.

## Architecture

```
agent.yml → [Validate] → [Generate] → [REST / MCP / WS / Webhook]
                ↓
         [Security Layer]
                ↓
         [Sandbox Runner]
                ↓
         [AI Pair Platform]
```

## Advanced Example

For a real-world example with multiple capabilities, complex schemas, and security policies, see `examples/stock-analyzer/agent.yml`.

## Supported Protocols

| Protocol | Status | Use Case |
|----------|--------|----------|
| REST API | ✅ Planned | Traditional developers |
| MCP Server | ✅ Planned | Claude / Cursor / VS Code |
| WebSocket | ✅ Planned | Real-time chatbots |
| Webhook | ✅ Planned | Event-driven systems |

## Security Features

- Sandboxed execution (Docker / gVisor / Firecracker)
- Rate limiting & resource quotas
- PII redaction
- Optional end-to-end encryption
- API key rotation

## License

MIT License — see [LICENSE](LICENSE)
Open-source tool to package your AI agent's capabilities into secure, multi-protocol service interfaces — REST API, MCP Server, WebSocket, Webhook, and Bot adapters.
