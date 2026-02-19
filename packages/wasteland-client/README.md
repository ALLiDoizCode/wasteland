# @wasteland/client

TypeScript client library for Wasteland task management and agent messaging on Nostr ILP.

## Installation

```bash
pnpm add @wasteland/client
```

## Quick Start

```typescript
import { WastelandClient, TaskStatus, Priority } from '@wasteland/client';

// Create client
const client = new WastelandClient({
  relayUrl: 'ws://localhost:7001',
  // Optional: provide private key, or one will be generated
  // privateKey: hexToBytes('your-private-key-hex'),
});

// Connect to relay
await client.connect();

// Create a task
const taskId = await client.createTask({
  id: 'my-task-1',
  title: 'Implement feature X',
  content: 'Detailed task description',
  status: TaskStatus.OPEN,
  priority: Priority.HIGH,
});

// Query tasks
const tasks = await client.queryTasks({
  status: TaskStatus.OPEN,
});

// Find ready tasks (no blockers)
const readyTasks = await client.findReady();

// Send a message
await client.sendMessage({
  recipient: 'recipient-pubkey-hex',
  subject: 'Task completed',
  content: 'I finished the task!',
  messageType: 'notification',
});

// Disconnect
client.disconnect();
```

## API Reference

### WastelandClient

Main client class for interacting with Wasteland.

#### Constructor

```typescript
constructor(config: WastelandClientConfig)
```

**Config Options:**
- `relayUrl: string` - WebSocket URL of the Nostr relay
- `privateKey?: Uint8Array` - Agent's private key (optional, will generate if not provided)
- `ilpConfig?: ILPPaymentConfig` - ILP payment configuration (optional for POC)

#### Connection Methods

```typescript
async connect(): Promise<void>
```
Connect to the relay.

```typescript
disconnect(): void
```
Disconnect from the relay.

```typescript
isConnected(): boolean
```
Check if connected to relay.

#### Task Management Methods

```typescript
async createTask(params: CreateTaskParams): Promise<string>
```
Create a new task. Returns event ID.

**CreateTaskParams:**
- `id: string` - Unique task identifier (within your namespace)
- `title: string` - Task title
- `content: string` - Task description (markdown)
- `status?: TaskStatus` - Task status (default: OPEN)
- `blocks?: string[]` - Event IDs of tasks this blocks
- `blockedBy?: string[]` - Event IDs of tasks blocking this
- `parent?: string` - Event ID of parent task/epic
- `priority?: Priority` - Priority level (default: NORMAL)

```typescript
async updateTask(existingTask: TaskEvent, updates: Partial<CreateTaskParams>): Promise<string>
```
Update an existing task. Returns new event ID.

```typescript
async queryTasks(filter?: TaskFilter): Promise<TaskEvent[]>
```
Query tasks from relay.

**TaskFilter:**
- `authors?: string[]` - Filter by author pubkeys
- `ids?: string[]` - Filter by task IDs
- `status?: TaskStatus | TaskStatus[]` - Filter by status
- `priority?: Priority | Priority[]` - Filter by priority
- `since?: number` - Unix timestamp (filter events after)
- `until?: number` - Unix timestamp (filter events before)
- `limit?: number` - Maximum results

```typescript
async findReady(authorPubkey?: string): Promise<TaskEvent[]>
```
Find ready tasks (tasks with no `blocked-by` tags). Optionally filter by author.

```typescript
async getMyTasks(status?: TaskStatus | TaskStatus[]): Promise<TaskEvent[]>
```
Get tasks authored by this agent.

```typescript
async getDependencyGraph(filter?: TaskFilter)
```
Build dependency graph from tasks matching filter.

```typescript
subscribeToTaskUpdates(filter: TaskFilter, callback: (task: TaskEvent) => void): string
```
Subscribe to real-time task updates. Returns subscription ID.

#### Messaging Methods

```typescript
async sendMessage(params: CreateMessageParams): Promise<string>
```
Send a message. Returns event ID.

**CreateMessageParams:**
- `recipient: string` - Recipient pubkey
- `subject: string` - Message subject
- `content: string` - Message body (markdown)
- `messageType: MessageType` - Message type
- `priority?: Priority` - Priority level (default: NORMAL)
- `threadId?: string` - Thread identifier (for conversations)
- `replyTo?: string` - Event ID being replied to

```typescript
async replyToMessage(originalMessage: MessageEvent, replyContent: string): Promise<string>
```
Reply to a message with automatic threading.

```typescript
async queryMessages(filter?: MessageFilter): Promise<MessageEvent[]>
```
Query messages from relay.

**MessageFilter:**
- `authors?: string[]` - Filter by sender pubkeys
- `recipients?: string[]` - Filter by recipient pubkeys
- `messageType?: MessageType | MessageType[]` - Filter by message type
- `threadId?: string` - Filter by thread ID
- `since?: number` - Unix timestamp
- `until?: number` - Unix timestamp
- `limit?: number` - Maximum results

```typescript
async getMyMessages(filter?: Omit<MessageFilter, 'recipients'>): Promise<MessageEvent[]>
```
Get messages sent to this agent.

```typescript
subscribeToMessages(callback: (message: MessageEvent) => void): string
```
Subscribe to incoming messages for this agent. Returns subscription ID.

```typescript
async sendPolecatDone(recipient: string, taskId: string, notes?: string): Promise<string>
```
Send a POLECAT_DONE message (task completion notification).

```typescript
async sendNotification(recipient: string, subject: string, content: string, priority?: Priority): Promise<string>
```
Send a notification message.

## Event Schemas

### Task Event (Kind 30100)

Parameterized replaceable event for task management.

**Tags:**
- `d` - Task identifier (unique within author namespace)
- `title` - Task title
- `status` - Task status: `open` | `in_progress` | `closed`
- `priority` - Priority: `low` | `normal` | `high` | `urgent`
- `blocks` - Event ID of task this blocks (can have multiple)
- `blocked-by` - Event ID of task blocking this (can have multiple)
- `parent` - Event ID of parent task/epic (optional)

**Content:** Task description in markdown

**Example:**
```json
{
  "kind": 30100,
  "pubkey": "...",
  "created_at": 1234567890,
  "tags": [
    ["d", "task-123"],
    ["title", "Implement authentication"],
    ["status", "open"],
    ["priority", "high"],
    ["blocked-by", "event-id-456"],
    ["parent", "epic-event-id"]
  ],
  "content": "Add JWT-based authentication with refresh tokens"
}
```

### Message Event (Kind 31000)

Regular replaceable event for agent messaging.

**Tags:**
- `p` - Recipient pubkey
- `subject` - Message subject
- `message-type` - Message type: `POLECAT_DONE` | `MERGE_READY` | `MERGED` | `MERGE_FAILED` | `notification` | `reply` | etc.
- `priority` - Priority level (optional)
- `thread-id` - Thread identifier for conversation tracking (optional)
- `e` - Event ID being replied to, with `reply` marker (optional, for threading)

**Content:** Message body in markdown

**Example:**
```json
{
  "kind": 31000,
  "pubkey": "...",
  "created_at": 1234567890,
  "tags": [
    ["p", "recipient-pubkey"],
    ["subject", "Task completed"],
    ["message-type", "POLECAT_DONE"],
    ["priority", "normal"],
    ["thread-id", "conversation-123"],
    ["e", "original-message-id", "", "reply"]
  ],
  "content": "Task 'implement-auth' has been completed successfully."
}
```

## Enumerations

### TaskStatus

```typescript
enum TaskStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  CLOSED = 'closed',
}
```

### Priority

```typescript
enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}
```

### MessageType

```typescript
enum MessageType {
  POLECAT_DONE = 'POLECAT_DONE',
  MERGE_READY = 'MERGE_READY',
  MERGED = 'MERGED',
  MERGE_FAILED = 'MERGE_FAILED',
  REWORK_REQUEST = 'REWORK_REQUEST',
  NOTIFICATION = 'notification',
  REPLY = 'reply',
  TASK = 'task',
  SCAVENGE = 'scavenge',
}
```

## Dependency Management

```typescript
import { buildDependencyGraph, getReadyTasks, isTaskReady } from '@wasteland/client';

// Get tasks and build graph
const tasks = await client.queryTasks();
const graph = buildDependencyGraph(tasks);

// Find ready tasks
const ready = getReadyTasks(graph);

// Check if specific task is ready
const isReady = isTaskReady(taskEventId, graph);
```

## Advanced Usage

### Connection Management with Auto-Reconnect

```typescript
import { createConnectionManager } from '@wasteland/client';

const connectionManager = createConnectionManager('ws://localhost:7001', {
  maxRetries: 10,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
});

await connectionManager.connect();

// Connection will automatically reconnect on disconnect
// Subscriptions will be resumed after reconnection
```

### Low-Level Event Creation

```typescript
import { createTaskEvent, signTaskEvent } from '@wasteland/client';
import { generateSecretKey } from 'nostr-tools';

const privateKey = generateSecretKey();

// Create unsigned event template
const eventTemplate = createTaskEvent({
  id: 'task-1',
  title: 'My Task',
  content: 'Task description',
});

// Sign event
const signedEvent = signTaskEvent(eventTemplate, privateKey);

// Publish via relay
// (normally done automatically by WastelandClient)
```

## License

MIT
