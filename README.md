# Wasteland Phase 0 POC

**Proof of Concept:** Core Task Management & Messaging on Nostr ILP

This POC validates that Nostr ILP can natively replace Beads (distributed task management) and Mailing Protocol (agent messaging) before committing to the full Wasteland roadmap.

## Overview

Wasteland implements distributed task management and agent messaging using:
- **Nostr** (Notes and Other Stuff Transmitted by Relays) for decentralized event distribution
- **ILP** (Interledger Protocol) for micropayment-gated event publishing
- **TypeScript** client library for agent development

### Key Features

- ✅ Task creation, querying, and dependency management (NIP-3001 subset)
- ✅ Agent messaging with threading and priority (NIP-3004 subset)
- ✅ ILP-gated publishing (pay to publish, free to read)
- ✅ Dependency graph traversal with ready task detection
- ✅ Demo agents with task worker pattern
- ✅ Performance benchmarks and risk validation

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 8
- Docker and Docker Compose

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build Packages

```bash
pnpm build
```

### 3. Start the Full Stack

```bash
docker-compose up
```

This starts:
- **Crosstown Relay** (ILP-gated Nostr relay) on port 7001
- **ILP Connector** on port 7768
- **3 Demo Agents** (task workers)

### 4. Watch Agent Activity

The demo agents will automatically:
1. Connect to the relay
2. Poll for ready tasks every 5 seconds
3. Claim open tasks
4. Simulate work (2-5 seconds)
5. Mark tasks as completed
6. Send POLECAT_DONE messages

## Project Structure

```
wasteland/
├── packages/
│   ├── wasteland-client/       # TypeScript client library
│   │   ├── src/
│   │   │   ├── types.ts        # Event types and schemas
│   │   │   ├── task.ts         # Task event creation
│   │   │   ├── message.ts      # Message event creation
│   │   │   ├── query.ts        # Query and subscription
│   │   │   ├── relay.ts        # Relay connection
│   │   │   ├── dependencies.ts # Dependency graph
│   │   │   ├── client.ts       # High-level client API
│   │   │   └── connection.ts   # Connection management
│   │   └── __tests__/          # Unit and integration tests
│   └── demo-agent/             # Demo agent application
│       ├── src/
│       │   ├── index.ts        # CLI entry point
│       │   ├── worker.ts       # Task worker agent
│       │   ├── config.ts       # Configuration loader
│       │   ├── benchmark.ts    # Performance benchmarks
│       │   └── clock-skew-test.ts # Clock skew validation
│       └── Dockerfile          # Multi-stage build
├── docker-compose.yml          # Full stack orchestration
└── README.md                   # This file
```

## Usage

### Using the CLI

The demo-agent CLI provides commands for manual testing:

#### Create a Task

```bash
pnpm --filter @wasteland/demo-agent dev create-task \
  --id task-1 \
  --title "Implement feature X" \
  --content "Detailed description" \
  --priority high
```

#### List Tasks

```bash
# List all tasks
pnpm --filter @wasteland/demo-agent dev list-tasks

# List only ready tasks
pnpm --filter @wasteland/demo-agent dev list-tasks --ready

# Filter by status
pnpm --filter @wasteland/demo-agent dev list-tasks --status open
```

#### Send a Message

```bash
pnpm --filter @wasteland/demo-agent dev send-message \
  --recipient <pubkey> \
  --subject "Hello" \
  --content "Message content" \
  --type notification
```

#### Start a Worker Agent

```bash
pnpm --filter @wasteland/demo-agent dev start
```

### Using the Client Library

```typescript
import { WastelandClient, TaskStatus } from '@wasteland/client';

const client = new WastelandClient({
  relayUrl: 'ws://localhost:7001',
});

await client.connect();

// Create a task
await client.createTask({
  id: 'my-task',
  title: 'My Task',
  content: 'Task description',
  status: TaskStatus.OPEN,
});

// Query ready tasks
const ready = await client.findReady();

client.disconnect();
```

See [`packages/wasteland-client/README.md`](packages/wasteland-client/README.md) for full API documentation.

## Running Tests

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run with coverage
pnpm --filter @wasteland/client test -- --coverage
```

### Integration Tests

Integration tests require a running relay:

```bash
# Start relay
docker-compose up relay

# Run integration tests
pnpm --filter @wasteland/client test integration
```

## Running Benchmarks

### Performance Benchmarks

```bash
# Ensure relay is running
docker-compose up relay

# Run benchmarks
pnpm --filter @wasteland/demo-agent exec tsx src/benchmark.ts
```

Benchmarks measure:
- Task creation latency (target: <500ms)
- Query latency (target: <200ms p95)
- Concurrent agent performance (10-20 agents)
- Throughput (events/second)

Results are saved to `benchmark-results-<timestamp>.json`.

### Clock Skew Validation

Test RISK-T1 mitigation (relay timestamp canonicity):

```bash
pnpm --filter @wasteland/demo-agent exec tsx src/clock-skew-test.ts
```

This test:
1. Creates agents with artificially skewed clocks (+/- 5 seconds)
2. Has agents create tasks simultaneously
3. Verifies relay uses canonical timestamps (not client timestamps)
4. Reports any ordering inconsistencies

## Configuration

### Environment Variables

Create a `.env` file in `packages/demo-agent/`:

```bash
cp packages/demo-agent/.env.example packages/demo-agent/.env
```

Key variables:
- `RELAY_URL` - WebSocket URL of relay (default: ws://localhost:7001)
- `AGENT_NAME` - Agent name for logging
- `AGENT_PRIVATE_KEY` - Private key (hex, optional - generates if not set)
- `POLLING_INTERVAL` - Task polling interval in ms (default: 5000)
- `WORK_DURATION_MIN` - Minimum simulated work time in seconds (default: 2)
- `WORK_DURATION_MAX` - Maximum simulated work time in seconds (default: 5)

### Docker Compose Configuration

Edit `docker-compose.yml` to:
- Change number of agents (add/remove `agent-N` services)
- Configure relay settings
- Adjust network configuration

## Architecture

### Event Kinds

- **30100** (Parameterized Replaceable): Task events (NIP-3001 subset)
- **31000** (Regular Replaceable): Message events (NIP-3004 subset)

### Task Dependencies

Tasks support three dependency types:
- **blocks**: Tasks this task blocks
- **blocked-by**: Tasks blocking this task
- **parent**: Parent task/epic

Ready tasks are those with no `blocked-by` tags.

### ILP Integration

- **Writes require payment**: Publishing events costs ILP payment
- **Reads are free**: Subscriptions and queries have no cost
- Payment validation handled by Crosstown relay's Business Logic Server

## Troubleshooting

### Relay Won't Start

```bash
# Check logs
docker-compose logs relay

# Ensure ILP connector is healthy
docker-compose ps
```

### Agents Can't Connect

```bash
# Verify relay is running
docker-compose ps relay

# Check relay is accessible
curl http://localhost:7001
```

### Tests Failing

```bash
# Ensure relay is running for integration tests
docker-compose up relay

# Check relay logs for errors
docker-compose logs relay

# Verify WebSocket connection
wscat -c ws://localhost:7001
```

### Build Errors

```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```

## POC Success Criteria

- ✅ **Functional**: Complete task lifecycle works (create → find ready → claim → complete → message)
- ✅ **Economic**: ILP payments gate writes correctly, reads are free
- 📊 **Performance**: <200ms p95 query latency, <500ms task creation (validate with benchmarks)
- 📊 **Risk Validation**: Clock skew resolved, relay handles load (validate with tests)
- ✅ **Pattern Mapping**: Clear 1:1 mapping between Beads/Gastown concepts and Nostr events

**NO-GO Triggers:**
- Race conditions unsolvable
- Latency >500ms p95
- Relay can't handle 10 agents
- ILP integration fundamentally broken

## Next Steps

After POC completion:
1. Review `POC-REPORT.md` for findings and recommendations
2. If GO: Proceed to Phase 1 (Agent Directory, Ephemeral Events)
3. If NO-GO: Re-evaluate architecture or return to Beads/Gastown

## Related Documentation

- [Client Library API](packages/wasteland-client/README.md)
- [Feasibility Analysis](_bmad-output/planning-artifacts/research/feasibility-beads-mailing-on-nostr-ilp-2026-02-19.md)
- [Tech Spec](_bmad-output/implementation-artifacts/tech-spec-wasteland-phase0-poc-core-task-messaging.md)

## License

MIT
