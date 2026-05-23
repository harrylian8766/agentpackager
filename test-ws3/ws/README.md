# Hello World WebSocket Server

> Auto-generated from AgentPackager

## Quick Start

```bash
cd ws/
npm install
npm run dev
```

Server starts on ws://localhost:3000/ws

## Protocol

### Message Format

**Client → Server:**
```json
{ "type": "call", "id": "capability-id", "payload": { ... } }
```

**Server → Client (success):**
```json
{ "type": "result", "id": "capability-id", "payload": { ... }, "timestamp": "2026-05-23T10:00:00.000Z" }
```

**Server → Client (error):**
```json
{ "type": "error", "id": "capability-id", "error": "Error message" }
```

### Welcome Message (on connect)

```json
{ "type": "connected", "agent": "hello-world", "version": "1.0.0", "capabilities": [...] }
```

## Capabilities

### greet

Say hello to someone

**Request:**

```json
{ "type": "call", "id": "greet", "payload": {
  "name": "World"
} }
```

**Response:**

```json
{ "type": "result", "id": "greet", "payload": {
  "message": "Hello message"
} }
```

### echo

Echo back whatever you send

**Request:**

```json
{ "type": "call", "id": "echo", "payload": {
  "text": "Hello text"
} }
```

**Response:**

```json
{ "type": "result", "id": "echo", "payload": {
  "echoed": "Hello echoed"
} }
```



## Health Check

HTTP GET http://localhost:3000/health
