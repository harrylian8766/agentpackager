# AgentPackager

> Package your AI agent's capabilities into secure, multi-protocol service interfaces.

## Philosophy

**AI agents should be composable, portable, and interoperable.**

The future of AI is not monolithic models that do everything — it's specialized agents that each excel at one thing, connected through standard protocols. AgentPackager is the infrastructure that makes this future possible.

**AI Pair** has demonstrated this philosophy at scale: [52 vertical AI application domains](https://aipair.ai) (aistock.hk, ailove.hk, aigame.hk, etc.) — each a specialized AI agent with its own landing page, capabilities, and entry point, forming a **decentralized AI application matrix**.

AgentPackager gives every AI agent developer the same superpower: define once, deploy everywhere.

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

### The Agent-as-a-Service Vision

```
Traditional AI:        One model, one interface, one platform
AgentPackager vision:  One agent, multiple protocols, any platform

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Your Agent    │────▶│  REST API       │────▶│  Web App        │
│   (agent.yml)   │     ├─────────────────┤     ├─────────────────┤
│                 │────▶│  MCP Server     │────▶│  Claude/Cursor  │
│                 │     ├─────────────────┤     ├─────────────────┤
│                 │────▶│  WebSocket      │────▶│  Real-time Chat │
│                 │     ├─────────────────┤     ├─────────────────┤
│                 │────▶│  Webhook        │────▶│  Event System   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Real-World Scale: AI Pair

| Domain | Agent Type | Protocols Used |
|--------|-----------|----------------|
| [aistock.hk](https://aistock.hk) | Stock Analysis | REST + WebSocket |
| [ailove.hk](https://ailove.hk) | Dating Advisor | REST + Webhook |
| [aigame.hk](https://aigame.hk) | Gaming Companion | REST + WebSocket |
| [aicode.hk](https://aicode.hk) | Coding Assistant | MCP + REST |
| ... + 48 more | ... | ... |

**52 specialized AI agents, each with multiple protocol interfaces, all packaged with AgentPackager.**

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
agent.yml → [Validate] → [Generate] → [REST / MCP / WS / Webhook / Landing]
                ↓
         [Security Layer]
                ↓
         [Sandbox Runner]
                ↓
         [AI Pair Platform] → 52 domain matrix
```

### Protocols Generated

| Protocol | Status | Use Case | Example Domain |
|----------|--------|----------|----------------|
| REST API | ✅ Ready | Traditional developers | aistock.hk/api |
| MCP Server | ✅ Ready | Claude / Cursor / VS Code | aicode.hk (coding) |
| WebSocket | ✅ Ready | Real-time chatbots | ailove.hk (live chat) |
| Webhook | ✅ Ready | Event-driven systems | aifin.hk (alerts) |
| **Landing Page** | ✅ Ready | User-facing entry point | all 52 .hk domains |

## The Decentralized AI Matrix

AI Pair operates **52 vertical AI application domains**, each an independent agent with its own front door:

| # | Domain | Category | Protocols |
|---|--------|----------|-----------|
| 1 | [ailove.hk](https://ailove.hk) | 💕 Dating | REST + WS + Landing |
| 2 | [aistock.hk](https://aistock.hk) | 📈 Stock | REST + WS + Landing |
| 3 | [aigame.hk](https://aigame.hk) | 🎮 Gaming | REST + WS + Landing |
| 4 | [aicode.hk](https://aicode.hk) | 💻 Coding | MCP + REST + Landing |
| 5 | [aifood.hk](https://aifood.hk) | 🍜 Food | REST + Webhook + Landing |
| ... | ... | ... | ... |
| 52 | [aiauction.hk](https://aiauction.hk) | 🔨 Auction | REST + Webhook + Landing |

**Every domain is:**
- Independently branded and SEO-optimized
- Multi-protocol (REST + MCP + WS + Webhook)
- Cross-linked via footer to 51 other agents
- Generated with AgentPackager from a single `agent.yml`

## Security Features

- Sandboxed execution (Docker / gVisor / Firecracker)
- Rate limiting & resource quotas
- PII redaction
- Optional end-to-end encryption
- API key rotation

## License

MIT License — see [LICENSE](LICENSE)

**AgentPackager** is an open-source tool to package your AI agent's capabilities into secure, multi-protocol service interfaces — REST API, MCP Server, WebSocket, Webhook, and Landing Page adapters.

**Built by [AI Pair](https://aipair.ai)** — the team behind [52 vertical AI application domains](https://aipair.ai) exploring decentralized AI distribution.

---

_"The future of AI is not one model doing everything — it's 52 specialized agents, each with their own front door, connected by standard protocols."_
