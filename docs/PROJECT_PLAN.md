# AgentPackager 项目方案

> **项目名称**: AgentPackager
> **仓库**: https://github.com/harrylian8766/agentpackager
> **定位**: 开源工具，帮助开发者把自己的 AI Agent 能力打包成安全、多协议的服务接口
> **核心思想**: "Define once, deploy everywhere" — 一份 manifest，同时生成 REST + MCP + WebSocket + Webhook
> **关联平台**: AI Pair (aipair.ai)

---

## 目录

- [1. 项目愿景](#1-项目愿景)
- [2. 核心问题](#2-核心问题)
- [3. 架构设计](#3-架构设计)
- [4. Agent Manifest 规范](#4-agent-manifest-规范)
- [5. 已完成里程碑](#5-已完成里程碑)
- [6. 待办事项（按优先级）](#6-待办事项按优先级)
- [7. 技术栈](#7-技术栈)
- [8. 竞品对比](#8-竞品对比)
- [9. 商业模式](#9-商业模式)
- [10. 部署信息](#10-部署信息)

---

## 1. 项目愿景

### 一句话

**AgentPackager 是一个开源 CLI 工具，让任何有 AI Agent 的人，只需写一份 YAML 配置文件，就能自动生成安全的多协议服务接口（REST API、MCP Server、WebSocket、Webhook），并一键发布到 AI Pair 平台对外提供服务。**

### 解决的问题

| 现状痛点 | AgentPackager 的解决 |
|---------|-------------------|
| Agent 能力分散在各个脚本/项目中 | 用声明式 manifest 统一描述能力 |
| 每次对外暴露都要手写 API | 自动生成 OpenAPI + 代码 |
| 安全靠自觉，没有标准 | 内置沙箱、限流、脱敏配置 |
| 多客户端对接重复造轮子 | 一次定义，同时输出 REST + MCP + WS |
| 不知道怎么发布到平台 | `agentpackager publish` 一键上传 |

### 类比

- **Webpack** 之于前端 → **AgentPackager** 之于 Agent
- 就像 Docker 让应用可移植，AgentPackager 让 Agent 能力可移植

---

## 2. 核心问题

### 2.1 Agent 能力怎么定义？

→ **Agent Manifest YAML** — 声明式配置，描述 Agent 的能力、参数、返回值、安全策略

### 2.2 怎么对接多协议？

→ **Generator 体系** — 从 manifest 自动生成：
- REST API (Express.js/FastAPI)
- MCP Server (@modelcontextprotocol/sdk)
- WebSocket (实时流)
- Webhook (异步回调)
- Bot 适配器 (Discord/Telegram/Feishu)

### 2.3 安全怎么解决？

→ **三层安全模型**：
1. **传输层**: TLS + 可选 E2E 加密 (RSA-4096 + AES-256-GCM)
2. **认证层**: API Key / OAuth2 / JWT / Pairing (借鉴 PairAI)
3. **执行层**: Docker/gVisor 沙箱 + 资源限制 + 网络白名单

---

## 3. 架构设计

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│  用户侧: AgentPackager CLI (开源)                                │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  agent.yml ──▶ [Validator] ──▶ [Generators]                      │
│                  (schema 校验)    ├──▶ REST API (Express/FastAPI) │
│                                   ├──▶ MCP Server (stdio/http)   │
│                                   ├──▶ WebSocket (实时流)         │
│                                   ├──▶ Webhook (回调)           │
│                                   └──▶ Bot Adapter (Discord/...) │
│                                       │                          │
│                                       ▼                          │
│                              [Security Layer]                     │
│                              ├── Docker 沙箱                      │
│                              ├── 限流/熔断                      │
│                              ├── PII 脱敏                       │
│                              └── 审计日志                       │
│                                       │                          │
│                                       ▼                          │
│                              [Docker Image]                      │
│                                       │                          │
│                                       ▼                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  AI Pair 平台侧 (已有)                                   │    │
│  │  ─────────────────────────────────────────────────────  │    │
│  │  • Claw Marketplace: 浏览/搜索/订阅 Agent 能力           │    │
│  │  • Connection 路由: 调用分发到目标 Agent               │    │
│  │  • 计费系统: 按调用次数/Token 计费                       │    │
│  │  • 信任体系: 评分/完成率/连接数                          │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 CLI 命令设计

```bash
# 初始化项目
agentpackager init my-agent

# 验证 manifest
agentpackager validate

# 生成多协议接口
agentpackager build --output ./dist

# 本地运行网关
agentpackager serve

# 一键发布到 AI Pair
agentpackager publish

# 检查配置
agentpackager doctor
```

### 3.3 目录结构规范

```
my-agent/
├── agent.yml              # 核心 manifest（用户手写）
├── src/
│   └── capabilities.ts    # 用户实现的能力逻辑
├── dist/                  # 自动生成（不提交 git）
│   ├── rest/              # Express.js 代码
│   ├── mcp/               # MCP Server 代码
│   └── ws/                # WebSocket 代码
├── Dockerfile             # 自动生成
└── README.md
```

---

## 4. Agent Manifest 规范

### 4.1 规范版本

- **当前版本**: v1.0.0
- **Schema 文件**: `schemas/agent-manifest-v1.json`
- **格式**: YAML（人类可读）或 JSON（机器处理）

### 4.2 核心字段

```yaml
name: "hello-world"              # Agent 唯一标识
version: "1.0.0"                # SemVer
description: "描述"
author:
  name: "Harry"
  email: "harry@example.com"

capabilities:                     # 能力列表（核心）
  - id: "greet"                 # 唯一 ID
    name: "Greet"                # 显示名称
    description: "打招呼"
    inputSchema:                 # 输入参数 JSON Schema
      type: object
      properties:
        name:
          type: string
          default: "World"
    outputSchema:                # 输出 JSON Schema
      type: object
      properties:
        message:
          type: string

security:                        # 安全策略
  sandbox:
    type: docker                 # docker/gvisor/firecracker
    network: restricted         # none/restricted/full
    allowedDomains:             # 网络白名单
      - api.kimi.com
    executionTimeout: 30s
    maxMemory: 512MiB
  rateLimit:
    requestsPerMinute: 60
  dataProtection:
    encryption: tls             # none/tls/e2e
    piiRedaction: true
  authentication:
    methods: [api_key, pairing]

runtime:                         # 运行时配置
  type: docker
  image: "my-agent:v1"
  command: "node index.js"
  env:
    - name: API_KEY
      value: "${secrets.API_KEY}"   # 引用密钥管理
      secret: true

protocols:                       # 暴露的协议
  rest:
    enabled: true
    basePath: /api/v1
    cors:
      enabled: true
  mcp:
    enabled: true
    transport: stdio              # stdio/http/sse
  websocket:
    enabled: false
    path: /ws
  webhook:
    enabled: false

platforms:                       # 平台集成
  aiPair:
    enabled: true
    endpoint: https://aipair.ai/api/v1/agents
  discord:
    enabled: false
```

### 4.3 设计原则

1. **约定优于配置**: 默认值合理，最小配置即可运行
2. **Schema 即文档**: inputSchema/outputSchema 同时用于验证和生成 API 文档
3. **安全默认**: 默认启用 TLS、PII 脱敏、Docker 沙箱
4. **协议无关**: 核心逻辑在 capabilities，协议适配由 generator 处理

---

## 5. 已完成里程碑

### v0.1.0 — 项目骨架 (2026-05-23)

| 组件 | 状态 | 文件 |
|------|------|------|
| Agent Manifest JSON Schema | ✅ | `schemas/agent-manifest-v1.json` |
| TypeScript 类型定义 | ✅ | `src/core/types.ts` |
| Manifest 验证器 | ✅ | `src/core/validator.ts` |
| CLI 骨架 (init/validate/build/serve/publish) | ✅ | `src/cli.ts` |
| 极简示例 (hello-world) | ✅ | `examples/hello-world/agent.yml` |
| 进阶示例 (stock-analyzer) | ✅ | `examples/stock-analyzer/agent.yml` |
| npm 包配置 | ✅ | `package.json` |

### v0.2.0 — REST API Generator (2026-05-23)

| 组件 | 状态 | 文件 |
|------|------|------|
| REST API 代码生成器 | ✅ | `src/generators/rest.ts` |
| 模板系统 | ✅ | `templates/rest/*.template` |
| TypeScript 接口生成 | ✅ | `src/generators/utils.ts` |
| 示例代码生成 | ✅ | 从 outputSchema 自动生成默认返回值 |
| API 文档生成 | ✅ | 自动生成 README.md |

**验证方式**:
```bash
cd ~/agentpackager
node dist/cli.js validate examples/hello-world/agent.yml   # ✅ 通过
node dist/cli.js build examples/hello-world/agent.yml         # ✅ 生成 4 个文件
```

### 生成物示例

`dist/rest/server.ts` — Express 应用，带：
- `/health` 健康检查
- `/api/v1` Agent 信息
- `POST /api/v1/greet` 能力路由（含类型安全的 handler）
- `POST /api/v1/echo` 能力路由
- CORS 配置
- 错误处理

`dist/rest/types.ts` — TypeScript 接口：
```typescript
export interface greetInput {
  name?: string; // Who to greet
}
export interface greetOutput {
  message: string;
}
```

---

## 6. 待办事项（按优先级）

### Phase 1: 核心协议（高优先级）

| # | 任务 | 说明 | 预计时间 |
|---|------|------|---------|
| 1 | **MCP Server Generator** | 生成 @modelcontextprotocol/sdk 封装，让 Claude/Cursor 能调用 | 3-5 天 |
| 2 | **Docker 打包** | `build` 同时生成 Dockerfile + docker-compose.yml | 2-3 天 |
| 3 | **运行时集成** | 用户实现 capabilities.ts，打包时自动接入生成的路由 | 3-5 天 |
| 4 | **Unit Tests** | 验证器、生成器的测试覆盖 | 2-3 天 |

### Phase 2: 多协议扩展（中优先级）

| # | 任务 | 说明 | 预计时间 |
|---|------|------|---------|
| 5 | **WebSocket Generator** | 实时流式响应 | 3-4 天 |
| 6 | **Webhook Generator** | 异步回调端点 | 2-3 天 |
| 7 | **Bot Adapter** | Discord/Telegram/Feishu Bot 一键生成 | 5-7 天 |
| 8 | **OpenAPI 导出** | 生成 openapi.json 供 Swagger UI 使用 | 2-3 天 |

### Phase 3: 安全增强（高优先级）

| # | 任务 | 说明 | 预计时间 |
|---|------|------|---------|
| 9 | **E2E 加密** | 参考 PairAI，实现 RSA-4096 + AES-256-GCM | 5-7 天 |
| 10 | **gVisor/Firecracker** | 比 Docker 更强的沙箱隔离 | 3-5 天 |
| 11 | **密钥管理** | Vault / K8s Secret 集成 | 3-4 天 |
| 12 | **审计日志** | 完整的调用链追踪 | 3-4 天 |

### Phase 4: 平台集成（中优先级）

| # | 任务 | 说明 | 预计时间 |
|---|------|------|---------|
| 13 | **AI Pair publish** | `agentpackager publish` 调用平台 API | 3-5 天 |
| 14 | **AI Pair Marketplace** | Claw 可以浏览/订阅 Agent 能力 | 5-7 天 |
| 15 | **计费集成** | 按调用次数计费 | 3-5 天 |
| 16 | **信任体系** | 评分/完成率/连接数 | 3-4 天 |

### Phase 5: 生态建设（低优先级）

| # | 任务 | 说明 | 预计时间 |
|---|------|------|---------|
| 17 | **更多示例** | 翻译器、代码审查、数据分析等 | 持续 |
| 18 | **VS Code 插件** | 在 IDE 里编辑 manifest | 5-7 天 |
| 19 | **在线 Playground** | Web 端验证和预览 | 7-10 天 |
| 20 | **社区文档** | 贡献指南、最佳实践 | 持续 |

---

## 7. 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| CLI | Node.js + TypeScript | 跨平台、npm 分发 |
| 验证 | AJV + JSON Schema | Manifest 校验 |
| 模板 | 字符串替换 | 代码生成 |
| REST | Express.js | HTTP API |
| MCP | @modelcontextprotocol/sdk | AI 工具集成 |
| 沙箱 | Docker / gVisor | 隔离执行 |
| 加密 | Node.js crypto | E2E 加密 |
| 配置 | YAML | 人类可读配置 |

---

## 8. 竞品对比

| 项目 | 方向 | 和 AgentPackager 的关系 |
|------|------|------------------------|
| **PairAI** | Agent ↔ Agent 协作 | 互补 — PairAI 做客户端通信，我们做服务端打包 |
| **GEOFlow** | AI 内容工程与分发 | 借鉴 — Skill 描述文件 + 多客户端适配 |
| **AI Pair (我们的)** | Agent 连接平台 | 集成 — AgentPackager 的输出发布到 AI Pair |
| **LangServe** | LangChain 部署 | 参考 — 但 AgentPackager 不绑定特定框架 |
| **Modal** | Serverless 部署 | 差异 — Modal 是托管平台，我们是打包工具 |

### 核心差异化

- **框架无关**: 不限定 LangChain/LlamaIndex，任何 Agent 都能用
- **多协议**: 一次定义，同时输出 REST + MCP + WS + Webhook
- **安全内置**: 沙箱、限流、脱敏是配置的一部分，不是事后加装
- **开源免费**: Apache/MIT 许可证，可商用

---

## 9. 商业模式

### 开源工具（免费）

- AgentPackager CLI — 完全开源，MIT 许可证
- Agent Manifest 规范 — 开放标准
- 社区示例 — 自由使用

### 平台服务（收费）

| 服务 | 定价模式 |
|------|---------|
| AI Pair Marketplace | 订阅制（免费/Pro/Enterprise） |
| 托管运行 | 按调用次数 + 计算资源 |
| 高级安全 | E2E 加密、合规审计（企业版） |
| 技术支持 | 商业支持合同 |

---

## 10. 部署信息

### 代码仓库

- **GitHub**: https://github.com/harrylian8766/agentpackager
- **License**: MIT
- **本机目录**: `~/agentpackager/`
- **VPS 备份**: `ubuntu@43.129.237.80:~/agentpackager/`

### 同步命令

```bash
# 本机推送
 cd ~/agentpackager
 git add . && git commit -m "update" && git push origin main

# VPS 拉取
ssh ubuntu@43.129.237.80 "cd ~/agentpackager && git pull"
```

### 环境

| 环境 | 路径/地址 | 说明 |
|------|----------|------|
| 本机 | 192.168.4.22 | 开发机 |
| VPS | 43.129.237.80 | 生产备份 |
| GitHub | harrylian8766/agentpackager | 主仓库 |

---

## 附录：快速参考

### Manifest 最小模板

```yaml
name: my-agent
version: "1.0.0"
description: "What this agent does"

capabilities:
  - id: hello
    name: Hello
    description: Say hello
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
    executionTimeout: 30s
    maxMemory: 256MiB
  rateLimit:
    requestsPerMinute: 60

protocols:
  rest:
    enabled: true
    basePath: /api/v1
  mcp:
    enabled: true
    transport: stdio
```

### CLI 快速上手

```bash
# 1. 安装
npm install -g agentpackager

# 2. 初始化
agentpackager init my-agent

# 3. 编辑 agent.yml 定义你的能力

# 4. 验证
agentpackager validate

# 5. 生成
agentpackager build --output ./dist

# 6. 运行
 cd dist/rest && npm install && npm run dev
```

---

*文档版本: v1.0.0*
*最后更新: 2026-05-23*
*作者: Harry Lian + 小龙 (AI Pair)*
