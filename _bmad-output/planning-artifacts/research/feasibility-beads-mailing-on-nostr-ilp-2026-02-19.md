---
type: feasibility-analysis
topic: Native Beads and Mailing Protocol Implementation on Crosstown (Nostr ILP)
date: 2026-02-19
author: Jonathan
status: in-progress
---

# Feasibility Analysis: Native Beads & Mailing Protocol on Nostr ILP

**Core Question:** Can Crosstown (ILP-gated Nostr relay network) natively solve the same problems that Beads and Mailing Protocol solve for Gastown, enabling decentralized agent orchestration (Wasteland)?

**Scope:** This is NOT about porting Go code or wrapping existing implementations. This is about understanding the VALUE and CAPABILITIES that Beads and Mailing Protocol provide, then determining if Nostr ILP can deliver the same value natively through new NIPs, event kinds, and data flow patterns.

---

## Part 1: Beads Problem-Solution Mapping

### Problem 1: Multi-Agent Coordination Without Collisions

**What Beads Solves:**
- Hash-based IDs (`bd-a1b2`) derived from UUIDs prevent ID collisions when multiple agents create issues concurrently
- Progressive scaling (4 chars → 5-6 chars as DB grows)
- Content hashing (SHA256) for change detection
- Enables distributed operation without central ID authority

**Can Nostr ILP Solve This Natively?**

**Nostr Solution:**
- ✅ **Event IDs**: Every Nostr event has a deterministic ID (SHA256 hash of serialized event)
- ✅ **No collision possible**: Hash of unique content + timestamp + pubkey + nonce
- ✅ **Decentralized**: No central authority needed, cryptographically guaranteed uniqueness
- ✅ **Content addressability**: Event ID is hash of content (similar to Beads content hashing)

**Native Implementation Pattern:**
```
Task Event (kind: 30000 - Parameterized Replaceable Event):
{
  "id": "<sha256-hash>",  // Auto-generated, collision-free
  "pubkey": "<agent-pubkey>",
  "kind": 30000,
  "tags": [
    ["d", "<task-identifier>"],  // Unique task ID within agent's namespace
    ["title", "Task title"],
    ["status", "open"],
    ["priority", "high"]
  ],
  "content": "Task description markdown",
  "created_at": <timestamp>,
  "sig": "<signature>"
}
```

**Assessment:** ✅ **NATIVE SOLUTION EXISTS**
- Nostr's cryptographic event IDs solve collision problem natively
- Parameterized replaceable events (kind 30000-39999) allow agent-scoped task IDs via `d` tag
- No additional protocol needed

---

### Problem 2: Context Window Management

**What Beads Solves:**
- **Compaction**: Summarizes old closed tasks to reduce context
- **Wisps**: Ephemeral local-only issues for routine work (not synced)
- **Molecules**: Template work patterns for structured workflows
- Reduces stored context while maintaining audit trail

**Can Nostr ILP Solve This Natively?**

**Nostr Solution:**
- ✅ **Ephemeral Events** (kind 20000-29999): Deleted after delivery, not stored by relays
  - Perfect for wisps (temporary work items)
- ✅ **Regular Events** (kind 1000-9999): Stored permanently for audit trail
- ✅ **Replaceable Events** (kind 10000-19999): Latest version replaces previous
  - Could use for compaction: Replace old task with summarized version
- ⚠️ **Molecules**: No native equivalent, would need custom NIP

**Native Implementation Pattern:**
```
Wisp (Ephemeral Task) - kind 20001:
{
  "kind": 20001,  // Ephemeral, relays don't store
  "tags": [
    ["d", "routine-task-123"],
    ["ephemeral", "true"]
  ],
  "content": "Quick task, no long-term storage needed"
}

Compacted Task Summary - kind 10001 (Replaceable):
{
  "kind": 10001,  // Replaces previous version
  "tags": [
    ["d", "bd-a1b2"],  // Original task ID
    ["status", "closed"],
    ["compacted", "true"],
    ["original-events", "<event-id-1>", "<event-id-2>"]  // References to full history
  ],
  "content": "Summary: Completed authentication feature. 3 subtasks, 5 comments, merged to main."
}
```

**Assessment:** ✅ **MOSTLY NATIVE, ONE CUSTOM NIP**
- Ephemeral events solve wisps natively
- Replaceable events can handle compaction
- Molecules would need custom NIP for workflow templates

---

### Problem 3: Long-Horizon Task Execution

**What Beads Solves:**
- **Dependencies**: `blocks`, `parent-child`, `related`, `discovered-from`, `conditional-blocks`
- Agents traverse dependency graph across multiple sessions
- Workflow can span days with automatic handoffs
- `bd ready` command finds tasks with no blockers

**Can Nostr ILP Solve This Natively?**

**Nostr Solution:**
- ✅ **Event Tags**: Can encode arbitrary relationships
- ✅ **Queries**: Relays support tag-based filtering
- ⚠️ **Dependency Resolution**: Would need client-side graph traversal (relays don't compute)

**Native Implementation Pattern:**
```
Task with Dependencies - kind 30001:
{
  "kind": 30001,
  "tags": [
    ["d", "task-456"],
    ["title", "Deploy to production"],
    ["status", "blocked"],
    ["blocks", "<event-id-of-task-789>"],  // This task blocks another
    ["blocked-by", "<event-id-of-task-123>"],  // Blocked by another task
    ["parent", "<event-id-of-epic>"],  // Hierarchical relationship
    ["dep-type", "blocks"],
    ["dep-type", "parent-child"]
  ],
  "content": "Cannot deploy until tests pass (task-123)"
}

Query for Ready Tasks:
REQ ["ready-tasks", {
  "kinds": [30001],
  "#status": ["open"],
  "#blocked-by": []  // No blocked-by tags = ready to work
}]
```

**Assessment:** ⚠️ **PARTIALLY NATIVE, NEEDS CLIENT LOGIC**
- Tags can encode dependencies natively
- Relay filtering can find tasks without blockers
- **Gap**: Complex dependency graph traversal happens client-side
- **Gap**: No native "ready" command - clients must implement logic
- **Opportunity**: Could create NIP for standardized dependency semantics

---

### Problem 4: Distributed Workflow Without Conflicts

**What Beads Solves:**
- Dolt's cell-level merge (better than line-based git)
- Content hashing + JSONL (one entity per line, merge-friendly)
- Zero merge conflicts in multi-agent/multi-branch scenarios
- Offline work "just works" (git pull/push handles sync)

**Can Nostr ILP Solve This Natively?**

**Nostr Solution:**
- ✅ **Immutable Events**: Events never change after signing (no merge conflicts)
- ✅ **Replaceable Events**: Latest version wins (eventual consistency)
- ✅ **Relay Distribution**: Events naturally spread across relays
- ✅ **Offline Publishing**: Client signs events offline, publishes when online
- ⚠️ **Conflict Resolution**: Last-write-wins for replaceable events (simpler than Dolt merge)

**Native Implementation Pattern:**
```
Agent A creates task offline:
{
  "id": "event-aaa",
  "kind": 30001,
  "tags": [["d", "task-789"], ["title", "Feature X"], ["status", "open"]],
  "created_at": 1000,
  "pubkey": "agent-a-pubkey"
}

Agent B updates same task offline:
{
  "id": "event-bbb",
  "kind": 30001,
  "tags": [["d", "task-789"], ["title", "Feature X"], ["status", "in_progress"]],
  "created_at": 1001,
  "pubkey": "agent-a-pubkey"  // Same pubkey (collaborative agents share identity)
}

When both come online:
- Relay accepts both (different event IDs)
- For replaceable events: Later timestamp (1001) wins
- Clients see latest state
- All history preserved (can query both events)
```

**Assessment:** ✅ **NATIVE SOLUTION EXISTS (SIMPLER MODEL)**
- Nostr's immutability + replaceable events = conflict-free by design
- Trade-off: Last-write-wins instead of merge (simpler, but less sophisticated)
- **Opportunity**: Could create NIP for collaborative editing with merge semantics
- **Advantage**: Simpler mental model than Dolt merging

---

### Problem 5: Offline-First Operation

**What Beads Solves:**
- Works completely offline (local Dolt database)
- `git push/pull` syncs issues across machines when online
- No special sync server needed
- Issues travel with your code

**Can Nostr ILP Solve This Natively?**

**Nostr Solution:**
- ✅ **Offline Event Creation**: Client signs events offline (no relay needed)
- ✅ **Batch Publishing**: Queue events, publish when online
- ✅ **Relay Sync**: Events sync across relays automatically (gossip protocol)
- ⚠️ **Local Storage**: Client must cache events locally (not built into protocol)
- ⚠️ **Git-like Sync**: Nostr doesn't use git, uses relay subscription model

**Native Implementation Pattern:**
```
Offline Agent Workflow:
1. Agent goes offline
2. Creates events locally, signs them
3. Stores in local SQLite/IndexedDB cache
4. When online, publishes to relays:
   EVENT <event-1>
   EVENT <event-2>
   EVENT <event-3>
5. Relays propagate to other relays
6. Other agents see events via subscriptions
```

**Assessment:** ✅ **NATIVE SOLUTION EXISTS (DIFFERENT MODEL)**
- Offline signing is native to Nostr
- Local caching is client responsibility (like git clone)
- Sync model is different: Relay push/sub instead of git pull/push
- **Trade-off**: No "git clone" equivalent - must query relays to discover work
- **Opportunity**: Could create NIP for event bundles (analogous to git pack files)

---

### Problem 6: Audit & Accountability

**What Beads Solves:**
- Every write auto-commits to Dolt history
- Complete change tracking (who, what, when)
- Time-travel queries possible with Dolt
- Commit messages link work to code (`bd-abc` in git messages)

**Can Nostr ILP Solve This Natively?**

**Nostr Solution:**
- ✅ **Cryptographic Signatures**: Every event signed by author (non-repudiation)
- ✅ **Immutable Events**: Events can't be changed after signing
- ✅ **Timestamp**: Every event has `created_at` timestamp
- ✅ **Event History**: Query relay for all events by author/tag over time
- ✅ **ILP Audit Trail**: Payment records prove resource consumption
- ⚠️ **Time-Travel**: Can query historical events, but no branching like Dolt

**Native Implementation Pattern:**
```
Task Update Event Chain:
Event 1 (created_at: 1000):
  {"kind": 30001, "tags": [["d", "task-1"], ["status", "open"]]}

Event 2 (created_at: 2000):
  {"kind": 30001, "tags": [["d", "task-1"], ["status", "in_progress"]]}

Event 3 (created_at: 3000):
  {"kind": 30001, "tags": [["d", "task-1"], ["status", "closed"]]}

Query audit trail:
REQ ["audit", {
  "kinds": [30001],
  "#d": ["task-1"],
  "since": 0,
  "until": 9999999999
}]
// Returns all 3 events, complete history
```

**Assessment:** ✅ **NATIVE SOLUTION EXISTS**
- Cryptographic signatures provide stronger audit than Dolt commits
- Event immutability guarantees no tampering
- ILP adds economic audit trail (who paid for what)
- **Advantage**: Cryptographic proof > database commits
- **Trade-off**: No branching/merging like git history

---

### Problem 7: Federation & Multi-Team Support

**What Beads Solves:**
- Peer-to-peer sync via Dolt remotes
- Data sovereignty tiers (T1-T4 for compliance)
- Flexible routing for contributors vs maintainers
- Regional/organizational isolation options

**Can Nostr ILP Solve This Natively?**

**Nostr Solution:**
- ✅ **Multi-Relay**: Clients can publish to multiple relays simultaneously
- ✅ **Relay Selection**: Clients choose which relays to use (sovereignty)
- ✅ **Peer Discovery**: NIP-02 follow lists, NIP-10032 peer info
- ✅ **Trust Networks**: Social graph via follow lists
- ✅ **ILP Peering**: SPSP handshakes establish payment channels between towns
- ✅ **Regional Relays**: Organizations can run private relays for compliance

**Native Implementation Pattern:**
```
Town A (US-based, public relay):
- Runs relay at wss://town-a.com
- Publishes work events to public relay
- Accepts ILP payments from any peer

Town B (EU-based, private relay):
- Runs relay at wss://town-b.internal (GDPR compliance)
- Only accepts connections from authorized agents
- Peer with Town A via ILP for cross-region work
- Events stay in EU for data sovereignty

Cross-Town Work Dispatch:
1. Town A publishes DVM job request (NIP-90) to public relay
2. Town B monitors public relay, sees job
3. Town B verifies ILP peer relationship with Town A
4. Town B claims job, publishes response to private relay
5. Town A monitors Town B's relay (authorized), sees completion
6. Payment flows via ILP channels
```

**Assessment:** ✅ **NATIVE SOLUTION EXISTS (BETTER THAN BEADS)**
- Relay selection = data sovereignty
- ILP peering = economic federation
- NIP-02 social graph = trust networks
- **Advantage**: More flexible than Dolt remotes (can use any relay)
- **Advantage**: Economic layer (ILP) adds accountability to federation

---

## Part 1 Summary: Beads Feasibility

| Problem | Nostr ILP Native Solution | Feasibility | Notes |
|---------|---------------------------|-------------|-------|
| **Multi-Agent Coordination** | ✅ Cryptographic event IDs | **NATIVE** | Better than hash-based IDs (cryptographic proof) |
| **Context Window Management** | ✅ Ephemeral + Replaceable events | **MOSTLY NATIVE** | Wisps = ephemeral events; Molecules need custom NIP |
| **Long-Horizon Execution** | ⚠️ Tags + client logic | **PARTIALLY NATIVE** | Dependencies via tags; graph traversal client-side |
| **Distributed Workflow** | ✅ Immutable + replaceable events | **NATIVE** | Simpler than Dolt (last-write-wins vs merge) |
| **Offline-First** | ✅ Offline signing + batch publish | **NATIVE** | Different model (relay sync vs git sync) |
| **Audit & Accountability** | ✅ Signatures + immutability + ILP | **NATIVE** | Stronger than Beads (cryptographic + economic proof) |
| **Federation** | ✅ Multi-relay + ILP peering | **NATIVE** | Better than Beads (more flexible, economic layer) |

**Overall Beads Feasibility: ✅ HIGH (6/7 native, 1/7 mostly native)**

---

## Part 2: Mailing Protocol Problem-Solution Mapping

### Problem 1: Inter-Agent Messaging (Structured Communication)

**What Mailing Protocol Solves:**
- Structured messages via beads (`type=message`)
- Message format: Subject + key-value pairs + markdown body
- Human-readable and debuggable
- Stored in beads database (persistent)
- Example:
  ```
  Subject: POLECAT_DONE worker-1
  From: greenplace/polecats/worker-1
  To: greenplace/witness
  Priority: normal

  Completed work on bd-a1b2. Branch ready for merge.
  ```

**Can Nostr Events Solve This Natively?**

**Nostr Solution:**
- ✅ **Event Structure**: JSON events with kind, content, tags
- ✅ **Structured Data**: Tags array for key-value pairs
- ✅ **Content**: Markdown in content field
- ✅ **Persistent**: Stored on relays
- ✅ **Human-Readable**: JSON format, easy to debug

**Native Implementation Pattern:**
```json
Agent Message Event (kind: 14 - Direct Message, or custom kind like 31000):
{
  "kind": 31000,
  "pubkey": "<worker-1-pubkey>",
  "tags": [
    ["p", "<witness-pubkey>"],  // Recipient
    ["subject", "POLECAT_DONE worker-1"],
    ["from", "greenplace/polecats/worker-1"],
    ["to", "greenplace/witness"],
    ["priority", "normal"],
    ["message-type", "POLECAT_DONE"],
    ["bead-id", "bd-a1b2"]
  ],
  "content": "Completed work on bd-a1b2. Branch ready for merge.",
  "created_at": <timestamp>,
  "sig": "<signature>"
}
```

**Assessment:** ✅ **NATIVE SOLUTION EXISTS**
- Nostr events naturally handle structured messages
- Tags provide key-value pairs (same as Mailing Protocol headers)
- Content field for markdown body
- **Advantage**: Cryptographically signed (proves sender identity)
- **Custom NIP needed**: Standardize agent message event kinds and tag semantics

---

### Problem 2: Routing (Direct, Queue, Broadcast)

**What Mailing Protocol Solves:**
- **Direct Routing**: `<rig>/<role>/<name>` - Send to specific agent
- **Queue Routing**: `queue:<name>` - Unclaimed work, first agent claims it
- **Broadcast Routing**: `channel:<name>` - Publish to all subscribers

**Can Nostr Events Solve This Natively?**

**Nostr Solution:**
- ✅ **Direct Messages**: `p` tag with recipient pubkey (NIP-04 encrypted, or public with custom kind)
- ✅ **Broadcast**: Regular events, agents subscribe via relay filters
- ⚠️ **Queues**: No native queue claiming, needs custom pattern

**Native Implementation Pattern:**

**Direct Message:**
```json
{
  "kind": 31000,
  "tags": [
    ["p", "<recipient-pubkey>"],  // Direct to specific agent
    ["to", "greenplace/witness"]
  ]
}
```

**Broadcast Channel:**
```json
{
  "kind": 31001,
  "tags": [
    ["channel", "announcements"],  // All agents subscribe to this channel
    ["t", "announcement"]  // Hashtag for filtering
  ],
  "content": "System maintenance in 1 hour"
}

// Agents subscribe:
REQ ["channel-sub", {
  "kinds": [31001],
  "#channel": ["announcements"]
}]
```

**Queue Pattern (Custom):**
```json
Work Queue Message:
{
  "kind": 31002,
  "tags": [
    ["queue", "merge-requests"],
    ["status", "unclaimed"],  // Initially unclaimed
    ["work-id", "merge-123"]
  ],
  "content": "Merge request for branch feature-x"
}

Agent Claims Work (publishes claim event):
{
  "kind": 31003,
  "tags": [
    ["e", "<work-event-id>"],  // Reference to work event
    ["queue", "merge-requests"],
    ["work-id", "merge-123"],
    ["claim-status", "claimed"],
    ["claimed-by", "<agent-pubkey>"]
  ],
  "created_at": <timestamp>
}

// Other agents query to see if claimed:
REQ ["check-claim", {
  "kinds": [31003],
  "#work-id": ["merge-123"]
}]
// If results exist, work is claimed
```

**Assessment:** ⚠️ **MOSTLY NATIVE, QUEUE PATTERN NEEDS CUSTOM NIP**
- Direct and broadcast work natively with Nostr
- Queue claiming requires custom event pattern (claim event referencing work event)
- **Custom NIP needed**: Standardize work queue claiming semantics
- **Race condition**: Multiple agents could claim simultaneously (needs consensus mechanism)

---

### Problem 3: Work Coordination Message Types

**What Mailing Protocol Solves:**
- Standardized message types for workflow:
  - POLECAT_DONE - Worker signals completion
  - MERGE_READY - Witness signals ready for merge
  - MERGED - Refinery confirms merge success
  - MERGE_FAILED - Refinery reports merge failure
  - REWORK_REQUEST - Refinery requests rebase
  - RECOVERED_BEAD - Witness recovered dead worker's task
  - RECOVERY_NEEDED - Manual recovery required
  - HELP - Request intervention
  - HANDOFF - Session continuity

**Can Nostr Events Solve This Natively?**

**Nostr Solution:**
- ✅ **Event Kinds**: Nostr allows custom event kinds (30000-39999 for parameterized replaceable)
- ✅ **Tags for Type**: Can use `message-type` tag
- ✅ **Standardization**: Create NIP defining each message type

**Native Implementation Pattern:**
```json
POLECAT_DONE Message (kind: 31100):
{
  "kind": 31100,
  "tags": [
    ["p", "<witness-pubkey>"],
    ["message-type", "POLECAT_DONE"],
    ["worker", "worker-1"],
    ["bead-id", "bd-a1b2"],
    ["branch", "feature-x"]
  ],
  "content": "Work complete, ready for merge"
}

MERGE_READY Message (kind: 31101):
{
  "kind": 31101,
  "tags": [
    ["p", "<refinery-pubkey>"],
    ["message-type", "MERGE_READY"],
    ["worker", "worker-1"],
    ["bead-id", "bd-a1b2"]
  ],
  "content": "Clean state verified, ready for merge queue"
}

MERGED Message (kind: 31102):
{
  "kind": 31102,
  "tags": [
    ["p", "<witness-pubkey>"],
    ["message-type", "MERGED"],
    ["worker", "worker-1"],
    ["bead-id", "bd-a1b2"],
    ["commit", "abc123"]
  ],
  "content": "Successfully merged to main"
}
```

**Assessment:** ✅ **NATIVE SOLUTION EXISTS**
- Event kinds can represent each message type
- Tags carry structured metadata
- **Custom NIP needed**: Define standard message types for agent coordination (like NIP-90 for DVMs)
- **Advantage**: Can extend with new message types without protocol changes

---

### Problem 4: Delivery Mechanisms (Queue vs Interrupt)

**What Mailing Protocol Solves:**
- **Queue Delivery**: Agent checks periodically with `gt mail check`
- **Interrupt Delivery**: System-reminder injected directly into agent session
  - Used for lifecycle events, URGENT priority, stuck detection
  - Immediate notification without polling

**Can Nostr Events Solve This Natively?**

**Nostr Solution:**
- ✅ **Queue (Pull)**: Agents subscribe to relay, relay pushes matching events
- ✅ **Real-Time Push**: WebSocket connection means instant delivery (no polling needed)
- ⚠️ **Interrupt**: No native "inject into session" - needs agent framework integration

**Native Implementation Pattern:**

**Queue Delivery (Standard Nostr):**
```javascript
// Agent subscribes to relay
relay.subscribe([
  {
    kinds: [31000, 31100, 31101, 31102],  // All message types
    "#p": [agentPubkey]  // Messages for this agent
  }
], (event) => {
  // Event delivered in real-time via WebSocket
  processMessage(event);
});
```

**Interrupt Pattern (Custom Agent Framework):**
```javascript
// High-priority message
{
  "kind": 31000,
  "tags": [
    ["p", "<agent-pubkey>"],
    ["priority", "urgent"],
    ["delivery", "interrupt"]
  ],
  "content": "URGENT: Deployment failing, rollback needed"
}

// Agent framework checks priority tag:
relay.subscribe(filter, (event) => {
  if (event.tags.find(t => t[0] === "priority" && t[1] === "urgent")) {
    // Inject into agent session (framework-specific)
    injectSystemReminder(event.content);
  } else {
    // Queue for normal processing
    messageQueue.push(event);
  }
});
```

**Assessment:** ✅ **NATIVE SOLUTION EXISTS (BETTER THAN POLLING)**
- WebSocket subscription provides real-time push (better than periodic polling)
- Priority tags can signal urgency
- "Interrupt" delivery requires agent framework support (not protocol-level)
- **Advantage**: No polling overhead, instant delivery
- **Trade-off**: Interrupt mechanism is framework-specific, not protocol-level

---

### Problem 5: Hierarchical Addressing

**What Mailing Protocol Solves:**
- Hierarchical agent addresses:
  - `mayor/` - Town Mayor
  - `deacon/` - Town Deacon
  - `<rig>/witness` - Rig's Witness
  - `<rig>/<polecat>` - Specific worker
  - `<rig>/crew/<name>` - Crew member
- Mailing lists: `list:<name>` - Fan out to multiple recipients
- Special addresses: `--human` - Human overseer

**Can Nostr Events Solve This Natively?**

**Nostr Solution:**
- ✅ **Pubkeys**: Each agent has unique pubkey (flat namespace)
- ⚠️ **Hierarchical Naming**: No native hierarchy, needs custom mapping
- ✅ **Mailing Lists**: `p` tag can include multiple recipients
- ✅ **NIP-05 Identity**: DNS-based identity verification (e.g., `agent@town.com`)

**Native Implementation Pattern:**

**Agent Identity Mapping Event:**
```json
Agent Profile (kind: 0 - Metadata):
{
  "kind": 0,
  "pubkey": "<witness-pubkey>",
  "content": JSON.stringify({
    "name": "witness",
    "display_name": "Witness (greenplace)",
    "about": "Rig witness for greenplace",
    "nip05": "witness.greenplace@wasteland.network",
    "agent_address": "greenplace/witness",
    "rig": "greenplace",
    "role": "witness"
  })
}

Directory Service (kind: 31500 - Agent Directory):
{
  "kind": 31500,
  "tags": [
    ["d", "greenplace"],  // Rig identifier
    ["agent", "witness", "<witness-pubkey>"],
    ["agent", "refinery", "<refinery-pubkey>"],
    ["agent", "worker-1", "<worker-1-pubkey>"],
    ["agent", "worker-2", "<worker-2-pubkey>"]
  ],
  "content": "Agent directory for greenplace rig"
}
```

**Sending to Hierarchical Address:**
```javascript
// Sender wants to send to "greenplace/witness"
// 1. Query directory service
const dir = await relay.get({
  kinds: [31500],
  "#d": ["greenplace"]
});

// 2. Look up witness pubkey
const witnessPubkey = dir.tags.find(
  t => t[0] === "agent" && t[1] === "witness"
)[2];

// 3. Send message
await relay.publish({
  kind: 31000,
  tags: [
    ["p", witnessPubkey],
    ["to", "greenplace/witness"]  // Human-readable address preserved
  ]
});
```

**Mailing List Pattern:**
```json
Mailing List Definition (kind: 31501):
{
  "kind": 31501,
  "tags": [
    ["d", "list:all-workers"],
    ["p", "<worker-1-pubkey>"],
    ["p", "<worker-2-pubkey>"],
    ["p", "<worker-3-pubkey>"]
  ],
  "content": "All workers mailing list"
}

// Sending to list: Include all pubkeys as p tags
```

**Assessment:** ⚠️ **NEEDS CUSTOM DIRECTORY PATTERN**
- Nostr pubkeys are flat, hierarchical addressing needs directory service
- Directory can be implemented as special event kind (31500+)
- NIP-05 provides DNS-based identity (human-readable)
- **Custom NIP needed**: Agent directory service specification
- **Trade-off**: Directory lookup adds complexity vs direct addressing

---

### Problem 6: Message Claiming (Work Queues)

**What Mailing Protocol Solves:**
- Messages sent to `queue:<name>` are unclaimed
- Agents claim messages with `ClaimedBy` and `ClaimedAt` fields
- First-come-first-served
- Other agents see claimed status and skip

**Can Nostr Events Solve This Natively?**

**Nostr Solution:**
- ⚠️ **No Native Claiming**: Nostr events are immutable, can't update to "claimed"
- ✅ **Claim Event Pattern**: Publish separate claim event that references work event
- ⚠️ **Race Conditions**: Multiple agents could publish claims simultaneously

**Native Implementation Pattern:**

**Work Event:**
```json
{
  "kind": 31200,
  "tags": [
    ["queue", "merge-queue"],
    ["work-id", "merge-456"],
    ["status", "available"]
  ],
  "content": "Merge branch feature-y"
}
```

**Claim Event:**
```json
{
  "kind": 31201,
  "tags": [
    ["e", "<work-event-id>"],  // Reference to work
    ["work-id", "merge-456"],
    ["claimed-by", "<agent-pubkey>"],
    ["claim-timestamp", "1000"]
  ],
  "content": "Claimed by worker-2"
}
```

**Claim Resolution Logic:**
```javascript
// Agent queries for unclaimed work
const workEvents = await relay.get({
  kinds: [31200],
  "#queue": ["merge-queue"],
  "#status": ["available"]
});

for (const work of workEvents) {
  // Check if already claimed
  const claims = await relay.get({
    kinds: [31201],
    "#work-id": [work.tags.find(t => t[0] === "work-id")[1]]
  });

  if (claims.length === 0) {
    // Not claimed, attempt to claim
    await publishClaim(work);
  } else {
    // Already claimed, skip
    continue;
  }
}

// Race condition: Two agents publish claims simultaneously
// Resolution: Earliest timestamp wins (or use other consensus)
function resolveClaimConflict(claims) {
  return claims.sort((a, b) => a.created_at - b.created_at)[0];
}
```

**Assessment:** ⚠️ **PARTIALLY NATIVE, NEEDS CONSENSUS PATTERN**
- Claim event pattern works but has race conditions
- Need consensus mechanism for simultaneous claims
- **Options for consensus**:
  1. Earliest timestamp wins (simple, but vulnerable to clock skew)
  2. Relay designates "canonical" claim (centralized)
  3. ILP payment lock (economic commitment - who pays first wins)
  4. Proof-of-work (computational commitment)
- **Custom NIP needed**: Work queue claiming with consensus rules
- **ILP Integration Opportunity**: Use ILP PREPARE as claim lock (atomic claim + payment)

---

### Problem 7: Thread/Conversation Tracking

**What Mailing Protocol Solves:**
- `ThreadID` - Groups messages into conversations
- `ReplyTo` - References previous message in thread
- Enables conversation context across multiple messages

**Can Nostr Events Solve This Natively?**

**Nostr Solution:**
- ✅ **Event References**: `e` tag references other events (NIP-10)
- ✅ **Thread Markers**: `reply`, `root`, `mention` markers
- ✅ **Native Threading**: Already used for Nostr social threads

**Native Implementation Pattern:**
```json
Root Message:
{
  "id": "event-aaa",
  "kind": 31000,
  "tags": [
    ["p", "<recipient>"],
    ["thread-id", "conversation-123"]  // Optional: explicit thread ID
  ],
  "content": "Starting merge process for bd-a1b2"
}

Reply:
{
  "kind": 31000,
  "tags": [
    ["p", "<recipient>"],
    ["e", "event-aaa", "", "root"],  // Reference to root message
    ["e", "event-aaa", "", "reply"],  // Direct reply
    ["thread-id", "conversation-123"]
  ],
  "content": "Merge successful"
}

Second Reply (in same thread):
{
  "kind": 31000,
  "tags": [
    ["p", "<recipient>"],
    ["e", "event-aaa", "", "root"],  // Still reference root
    ["e", "event-bbb", "", "reply"],  // Reply to previous message
    ["thread-id", "conversation-123"]
  ],
  "content": "Tests passing, ready to deploy"
}

// Query entire thread:
REQ ["thread", {
  "kinds": [31000],
  "#thread-id": ["conversation-123"]
}]
```

**Assessment:** ✅ **NATIVE SOLUTION EXISTS**
- NIP-10 event references provide threading
- Markers (root, reply, mention) clarify relationships
- Can query entire conversation thread
- **Advantage**: Standardized across Nostr ecosystem
- **No custom NIP needed**: Use existing NIP-10

---

### Problem 8: Priority Handling

**What Mailing Protocol Solves:**
- Message priorities: urgent / high / normal / low
- Urgent messages get interrupt delivery
- Agents can prioritize processing high-priority messages

**Can Nostr Events Solve This Natively?**

**Nostr Solution:**
- ✅ **Priority Tag**: Custom tag for priority level
- ✅ **Client Filtering**: Agents filter/sort by priority
- ✅ **Multiple Subscriptions**: Separate subscriptions for urgent vs normal

**Native Implementation Pattern:**
```json
Urgent Message:
{
  "kind": 31000,
  "tags": [
    ["p", "<agent-pubkey>"],
    ["priority", "urgent"],
    ["expiry", "1234567890"]  // Optional: message expires if not handled by timestamp
  ],
  "content": "CRITICAL: Deployment rollback needed immediately"
}

// Agent uses multiple subscriptions:
// Subscription 1: Urgent messages only
relay.subscribe({
  kinds: [31000],
  "#p": [agentPubkey],
  "#priority": ["urgent"]
}, urgentHandler);

// Subscription 2: All other messages
relay.subscribe({
  kinds: [31000],
  "#p": [agentPubkey]
}, normalHandler);
```

**Assessment:** ✅ **NATIVE SOLUTION EXISTS**
- Tags handle priority naturally
- Client-side filtering and routing based on priority
- Expiry tag can add time-sensitive handling
- **No custom NIP needed**: Standard tag pattern

---

### Problem 9: Message Lifecycle (Read Status, Pinning, Archival)

**What Mailing Protocol Solves:**
- `Read` - Boolean flag indicating message was read
- `Pinned` - Don't auto-archive important messages
- `Wisp` - Ephemeral/transient messages (auto-delete)
- Auto-archival of old read messages

**Can Nostr Events Solve This Natively?**

**Nostr Solution:**
- ⚠️ **No Native Read Status**: Events are immutable, can't mark as "read"
- ✅ **Ephemeral Events**: Kind 20000-29999 for wisps (relays don't store)
- ✅ **Client-Side State**: Agent tracks read/unread/pinned locally

**Native Implementation Pattern:**

**Ephemeral Message (Wisp):**
```json
{
  "kind": 21000,  // Ephemeral, relays delete after delivery
  "tags": [
    ["p", "<agent-pubkey>"],
    ["ephemeral", "true"]
  ],
  "content": "Quick status update, no need to store"
}
```

**Read Status Tracking (Client-Side):**
```javascript
// Agent maintains local SQLite database
class MessageTracker {
  async markRead(eventId) {
    await db.run(
      "INSERT INTO message_status (event_id, read, pinned, archived) VALUES (?, true, false, false)",
      eventId
    );
  }

  async pin(eventId) {
    await db.run(
      "UPDATE message_status SET pinned = true WHERE event_id = ?",
      eventId
    );
  }

  async archive(eventId) {
    await db.run(
      "UPDATE message_status SET archived = true WHERE event_id = ? AND pinned = false",
      eventId
    );
  }
}
```

**Optional: Read Receipt Event (If Sender Needs Confirmation):**
```json
{
  "kind": 31300,
  "tags": [
    ["e", "<message-event-id>"],  // Message that was read
    ["p", "<sender-pubkey>"],  // Notify sender
    ["read-status", "read"],
    ["read-timestamp", "1234567890"]
  ],
  "content": "Message received and read"
}
```

**Assessment:** ⚠️ **CLIENT-SIDE SOLUTION**
- Read/pin/archive status is client-side state (like email clients)
- Ephemeral events handle wisps natively
- Read receipts possible via separate events (optional)
- **No custom NIP needed**: Standard client-side pattern
- **Trade-off**: Read status not synced across agent sessions (unless published as event)

---

## Part 2 Summary: Mailing Protocol Feasibility

| Problem | Nostr Events Native Solution | Feasibility | Notes |
|---------|------------------------------|-------------|-------|
| **Inter-Agent Messaging** | ✅ Events with tags + content | **NATIVE** | Custom NIP for agent message kinds |
| **Routing (Direct/Broadcast)** | ✅ `p` tags, subscriptions | **NATIVE** | Direct and broadcast work natively |
| **Routing (Queues)** | ⚠️ Claim event pattern | **NEEDS CUSTOM NIP** | Race conditions need consensus mechanism |
| **Work Coordination Types** | ✅ Event kinds for each type | **NATIVE** | Custom NIP defining message types |
| **Delivery (Queue/Interrupt)** | ✅ WebSocket push + priority tags | **NATIVE** | Better than polling; interrupt is framework-level |
| **Hierarchical Addressing** | ⚠️ Directory service pattern | **NEEDS CUSTOM NIP** | Pubkeys are flat, need directory lookup |
| **Message Claiming** | ⚠️ Claim events + consensus | **NEEDS CUSTOM NIP** | ILP integration opportunity for atomic claiming |
| **Thread Tracking** | ✅ NIP-10 event references | **NATIVE** | Already standardized |
| **Priority Handling** | ✅ Priority tags + filtering | **NATIVE** | Client-side prioritization |
| **Message Lifecycle** | ⚠️ Client-side state + ephemeral events | **CLIENT-SIDE** | Wisps = ephemeral events; read status local |

**Overall Mailing Protocol Feasibility: ✅ HIGH (6/10 native, 4/10 need custom patterns)**

---

## Combined Feasibility Assessment

### Beads: ✅ **6/7 NATIVE** (86% native coverage)
- Multi-agent coordination: ✅ Native (cryptographic event IDs)
- Context management: ✅ Mostly native (ephemeral + replaceable events)
- Long-horizon execution: ⚠️ Partially native (tags + client logic)
- Distributed workflow: ✅ Native (immutable + replaceable)
- Offline-first: ✅ Native (offline signing + batch publish)
- Audit & accountability: ✅ Native (signatures + immutability + ILP)
- Federation: ✅ Native (multi-relay + ILP peering)

### Mailing Protocol: ✅ **6/10 NATIVE** (60% native coverage)
- Messaging: ✅ Native
- Direct/broadcast routing: ✅ Native
- Queue routing: ⚠️ Needs custom NIP
- Work coordination: ✅ Native (custom message kinds)
- Delivery: ✅ Native (WebSocket push)
- Addressing: ⚠️ Needs directory service
- Claiming: ⚠️ Needs consensus pattern
- Threading: ✅ Native (NIP-10)
- Priority: ✅ Native
- Lifecycle: ⚠️ Client-side

### Overall Feasibility: ✅ **HIGH (75% native coverage)**

**Critical Gaps Requiring Custom NIPs:**
1. **Work Queue Claiming with Consensus** - Race condition resolution
2. **Agent Directory Service** - Hierarchical addressing lookup
3. **Dependency Graph Semantics** - Standardized dependency types
4. **Agent Message Types** - POLECAT_DONE, MERGE_READY, etc.
5. **Workflow Templates** - Molecules equivalent

**Key Advantages of Nostr ILP:**
1. ✅ Cryptographic authentication (stronger than Beads)
2. ✅ Economic layer (ILP adds accountability)
3. ✅ Real-time push delivery (better than polling)
4. ✅ Decentralized federation (more flexible than Dolt remotes)
5. ✅ Standardized protocol (NIPs provide ecosystem)

**Key Trade-offs:**
1. ⚠️ Simpler conflict resolution (last-write-wins vs Dolt merge)
2. ⚠️ Client-side graph traversal (vs database queries)
3. ⚠️ Directory lookup overhead (vs direct addressing)
4. ⚠️ Consensus needed for claiming (vs database locks)

---

## Part 3: Required NIPs and Event Kinds

This section specifies the custom NIPs needed to achieve native Beads + Mailing Protocol functionality on Nostr ILP.

**Note on NIP Numbering:** We use the 3000-series range (NIP-3001 through NIP-3005) to avoid conflicts with official Nostr NIPs (NIP-01 through NIP-99) and common application NIPs (NIP-90, NIP-96, etc.).

### NIP-3001: Agent Task Management

**Title:** Agent Task Management and Dependencies

**Purpose:** Standardize how AI agents create, track, and coordinate tasks on Nostr relays.

**Status:** DRAFT - Custom NIP Required

**Event Kinds:**

| Kind | Name | Type | Description |
|------|------|------|-------------|
| 30100 | Task | Parameterized Replaceable | Work item (task, epic, bug, feature, chore) |
| 30101 | Epic | Parameterized Replaceable | Parent task containing subtasks |
| 30102 | Task Update | Parameterized Replaceable | Update to existing task (uses same `d` tag) |
| 20100 | Wisp Task | Ephemeral | Temporary task, not stored long-term |

**Required Tags:**

```
Task Event (kind 30100):
{
  "kind": 30100,
  "tags": [
    ["d", "<task-identifier>"],          // REQUIRED: Unique task ID within agent namespace
    ["title", "<task-title>"],           // REQUIRED: Brief task description
    ["status", "<status>"],              // REQUIRED: open|in_progress|blocked|closed
    ["priority", "<priority>"],          // OPTIONAL: low|normal|high|urgent
    ["type", "<type>"],                  // OPTIONAL: task|epic|bug|feature|chore|message
    ["assignee", "<pubkey>"],            // OPTIONAL: Assigned agent pubkey
    ["blocks", "<event-id>"],            // OPTIONAL: This task blocks another (multiple allowed)
    ["blocked-by", "<event-id>"],        // OPTIONAL: Blocked by another task (multiple allowed)
    ["parent", "<event-id>"],            // OPTIONAL: Parent epic/task
    ["child", "<event-id>"],             // OPTIONAL: Child task (multiple allowed)
    ["related", "<event-id>"],           // OPTIONAL: Related task (soft link)
    ["discovered-from", "<event-id>"],   // OPTIONAL: Found during parent work
    ["dep-type", "<type>"],              // OPTIONAL: blocks|parent-child|related|discovered-from
    ["label", "<label>"],                // OPTIONAL: Tag/label (multiple allowed)
    ["created-by", "<pubkey>"],          // OPTIONAL: Original creator
    ["estimate", "<hours>"],             // OPTIONAL: Time estimate
    ["actual", "<hours>"]                // OPTIONAL: Actual time spent
  ],
  "content": "<markdown-description>",   // Detailed task description
  "created_at": <timestamp>,
  "sig": "<signature>"
}
```

**Example Events:**

```json
Epic Task:
{
  "kind": 30101,
  "pubkey": "agent-a-pubkey",
  "tags": [
    ["d", "epic-auth"],
    ["title", "Implement user authentication"],
    ["status", "in_progress"],
    ["type", "epic"],
    ["priority", "high"]
  ],
  "content": "# User Authentication Epic\n\nImplement complete auth system with OAuth2, JWT, and session management."
}

Subtask (Child):
{
  "kind": 30100,
  "pubkey": "agent-a-pubkey",
  "tags": [
    ["d", "task-oauth"],
    ["title", "Add OAuth2 provider integration"],
    ["status", "open"],
    ["type", "task"],
    ["parent", "<epic-auth-event-id>"],
    ["blocked-by", "<task-jwt-event-id>"],
    ["dep-type", "parent-child"],
    ["dep-type", "blocks"]
  ],
  "content": "Integrate OAuth2 providers: Google, GitHub, Microsoft"
}

Wisp (Ephemeral):
{
  "kind": 20100,
  "pubkey": "agent-b-pubkey",
  "tags": [
    ["d", "wisp-format-code"],
    ["title", "Run code formatter"],
    ["ephemeral", "true"]
  ],
  "content": "Quick formatting pass, no need to track"
}
```

**Querying Ready Tasks:**

```javascript
// Find tasks with no blockers (ready to work)
REQ ["ready-tasks", {
  "kinds": [30100],
  "#status": ["open"],
  "authors": [teamPubkeys]  // Filter by team
}]

// Client-side filtering:
const readyTasks = tasks.filter(task => {
  const blockedBy = task.tags.filter(t => t[0] === "blocked-by");
  return blockedBy.length === 0;
});
```

**Implementation Notes:**
- Dependency graph traversal happens client-side (relays don't compute)
- Use parameterized replaceable events (kind 30000+) for updateability
- `d` tag creates agent-scoped namespace (agent can reuse IDs across tasks)
- Multiple `blocks`/`blocked-by` tags allow complex dependency graphs
- Ephemeral wisps (kind 20000+) reduce relay storage for routine work

**Why Needed:** Solves Beads problems 3 (long-horizon execution) and 2 (context management with wisps).

---

### NIP-3002: Agent Directory Service

**Title:** Hierarchical Agent Identity and Discovery

**Purpose:** Map human-readable hierarchical addresses (e.g., `greenplace/witness`) to Nostr pubkeys.

**Status:** DRAFT - Custom NIP Required

**Event Kinds:**

| Kind | Name | Type | Description |
|------|------|------|-------------|
| 30200 | Agent Profile | Parameterized Replaceable | Agent metadata with hierarchical address |
| 30201 | Rig Directory | Parameterized Replaceable | Maps rig agents to pubkeys |
| 30202 | Town Directory | Parameterized Replaceable | Maps town-level agents to pubkeys |

**Agent Profile (kind 30200):**

```json
{
  "kind": 30200,
  "pubkey": "<agent-pubkey>",
  "tags": [
    ["d", "agent-profile"],
    ["name", "witness"],                    // Agent name
    ["rig", "greenplace"],                  // Rig identifier
    ["role", "witness"],                    // Role: witness|refinery|polecat|crew|mayor|deacon
    ["address", "greenplace/witness"],      // Full hierarchical address
    ["nip05", "witness.greenplace@wasteland.network"],  // DNS-based identity
    ["ilp-address", "g.wasteland.greenplace.witness"],  // ILP payment address
    ["btp-endpoint", "wss://greenplace.wasteland.network:3000"]  // BTP endpoint
  ],
  "content": JSON.stringify({
    "display_name": "Witness (greenplace)",
    "about": "Rig witness monitoring polecat health",
    "capabilities": ["health-monitoring", "cleanup", "recovery"],
    "version": "1.0.0"
  })
}
```

**Rig Directory (kind 30201):**

```json
{
  "kind": 30201,
  "pubkey": "<town-mayor-pubkey>",  // Mayor publishes rig directories
  "tags": [
    ["d", "rig:greenplace"],
    ["rig", "greenplace"],
    ["agent", "witness", "<witness-pubkey>", "greenplace/witness"],
    ["agent", "refinery", "<refinery-pubkey>", "greenplace/refinery"],
    ["agent", "worker-1", "<worker-1-pubkey>", "greenplace/polecats/worker-1"],
    ["agent", "worker-2", "<worker-2-pubkey>", "greenplace/polecats/worker-2"],
    ["agent", "alice", "<alice-pubkey>", "greenplace/crew/alice"]
  ],
  "content": JSON.stringify({
    "rig_name": "greenplace",
    "project": "wasteland-core",
    "repo": "https://github.com/wasteland/core"
  })
}
```

**Town Directory (kind 30202):**

```json
{
  "kind": 30202,
  "pubkey": "<town-founder-pubkey>",
  "tags": [
    ["d", "town:wasteland"],
    ["town", "wasteland"],
    ["agent", "mayor", "<mayor-pubkey>", "mayor/"],
    ["agent", "deacon", "<deacon-pubkey>", "deacon/"],
    ["rig", "greenplace", "<rig-directory-event-id>"],
    ["rig", "vault13", "<vault13-directory-event-id>"]
  ],
  "content": JSON.stringify({
    "town_name": "Wasteland Network",
    "website": "https://wasteland.network",
    "relay": "wss://relay.wasteland.network"
  })
}
```

**Address Resolution Algorithm:**

```javascript
async function resolveAddress(address) {
  // Parse address: "greenplace/witness" or "mayor/"
  const parts = address.split('/');

  if (parts[0] === 'mayor' || parts[0] === 'deacon') {
    // Town-level agent
    const townDir = await relay.get({
      kinds: [30202],
      "#town": [currentTown]
    });
    return findAgentInDirectory(townDir, parts[0]);
  } else {
    // Rig-level agent
    const [rig, ...rest] = parts;
    const rigDir = await relay.get({
      kinds: [30201],
      "#rig": [rig]
    });
    const role = rest.join('/');  // "witness" or "polecats/worker-1"
    return findAgentInDirectory(rigDir, role);
  }
}

function findAgentInDirectory(directory, agentName) {
  const agentTag = directory.tags.find(
    t => t[0] === "agent" && (t[1] === agentName || t[3] === agentName)
  );
  return agentTag ? agentTag[2] : null;  // Return pubkey
}
```

**Mailing Lists:**

```json
Mailing List (kind 30203):
{
  "kind": 30203,
  "tags": [
    ["d", "list:all-workers"],
    ["list-name", "all-workers"],
    ["p", "<worker-1-pubkey>"],
    ["p", "<worker-2-pubkey>"],
    ["p", "<worker-3-pubkey>"],
    ["owner", "<mayor-pubkey>"]
  ],
  "content": "All workers in greenplace rig"
}
```

**Why Needed:** Solves Mailing Protocol problem 5 (hierarchical addressing). Allows human-readable addresses while preserving flat pubkey security model.

---

### NIP-3003: Work Queue Claiming with ILP Lock

**Title:** Atomic Work Queue Claiming via ILP Payment Lock

**Purpose:** Enable multiple agents to compete for work items without race conditions using ILP as claim lock.

**Status:** DRAFT - Custom NIP Required

**Event Kinds:**

| Kind | Name | Type | Description |
|------|------|------|-------------|
| 30300 | Work Item | Parameterized Replaceable | Available work in queue |
| 30301 | Claim Lock | Parameterized Replaceable | ILP-backed claim on work item |
| 30302 | Claim Release | Regular | Release claimed work back to queue |

**Work Item (kind 30300):**

```json
{
  "kind": 30300,
  "pubkey": "<work-publisher-pubkey>",
  "tags": [
    ["d", "work:merge-456"],
    ["queue", "merge-queue"],
    ["work-id", "merge-456"],
    ["status", "available"],
    ["reward", "1000"],           // ILP units for completing work
    ["claim-deposit", "100"],     // ILP deposit required to claim (prevents spam claims)
    ["claim-timeout", "300"],     // Seconds until unclaimed if no progress
    ["expiry", "1234567890"]      // Work expires if not claimed by timestamp
  ],
  "content": JSON.stringify({
    "title": "Merge branch feature-y",
    "description": "Merge feature-y into main after review",
    "branch": "feature-y",
    "tests_required": true
  })
}
```

**Claim Lock (kind 30301):**

```json
{
  "kind": 30301,
  "pubkey": "<claiming-agent-pubkey>",
  "tags": [
    ["d", "claim:merge-456"],
    ["e", "<work-event-id>"],                // Work being claimed
    ["work-id", "merge-456"],
    ["claimed-by", "<claiming-agent-pubkey>"],
    ["claim-timestamp", "1000"],
    ["ilp-prepare", "<ilp-prepare-hash>"],   // Hash of ILP PREPARE packet
    ["ilp-amount", "100"],                   // Deposit amount locked
    ["ilp-condition", "<condition-hash>"],   // ILP fulfillment condition
    ["claim-timeout", "1300"]                // Timestamp when claim expires
  ],
  "content": JSON.stringify({
    "ilp_prepare_packet": "<base64-encoded-prepare>",
    "status": "locked"
  })
}
```

**Atomic Claiming Protocol:**

```
1. Agent A discovers available work (query kind 30300 with status=available)

2. Agent A prepares ILP PREPARE packet:
   - Amount: claim-deposit (100 units)
   - Destination: Work publisher's ILP address
   - Condition: SHA256(preimage)
   - Expires: claim-timeout (300 seconds)
   - Data: work-id + claiming-agent-pubkey

3. Agent A sends ILP PREPARE to Crosstown relay
   - Relay validates payment >= claim-deposit
   - Relay stores PREPARE in escrow (not fulfilled yet)

4. Agent A publishes Claim Lock event (kind 30301)
   - Includes ilp-prepare-hash to prove payment lock
   - Event created_at becomes canonical claim timestamp

5. Claim Resolution:
   a) If multiple agents publish claims simultaneously:
      - Earliest created_at wins
      - Winner revealed when relay indexes events
   b) Winner is agent whose claim event has earliest timestamp

6. Work Publisher validates claim:
   - Query for claim events (kind 30301) referencing work
   - Check ILP PREPARE is valid (query Crosstown for hash)
   - Accept earliest claim as winner

7. Winner proceeds with work:
   - Updates work status to "in_progress"
   - Completes work
   - Publishes completion event

8. Settlement:
   a) Success path:
      - Work publisher validates completion
      - Publisher fulfills ILP PREPARE (agent gets deposit back)
      - Publisher sends reward payment to agent
   b) Timeout path:
      - Claim expires (claim-timeout reached)
      - ILP PREPARE expires, deposit returned to agent
      - Work returns to available status
   c) Failure path:
      - Agent fails to complete work
      - Work publisher rejects completion
      - Deposit forfeited (slash mechanism)
```

**Example Flow:**

```json
// Step 1: Work available
{
  "kind": 30300,
  "tags": [
    ["d", "work:merge-456"],
    ["status", "available"],
    ["reward", "1000"],
    ["claim-deposit", "100"]
  ]
}

// Step 2: Agent publishes claim with ILP lock
{
  "kind": 30301,
  "pubkey": "agent-worker-2",
  "tags": [
    ["work-id", "merge-456"],
    ["ilp-prepare", "abc123..."],
    ["ilp-amount", "100"],
    ["claim-timestamp", "1000"]
  ],
  "created_at": 1000  // This timestamp determines winner
}

// Step 3: Competing claim (loses due to later timestamp)
{
  "kind": 30301,
  "pubkey": "agent-worker-3",
  "tags": [
    ["work-id", "merge-456"],
    ["ilp-prepare", "def456..."],
    ["claim-timestamp", "1002"]
  ],
  "created_at": 1002  // Later timestamp, loses
}

// Step 4: Winner updates work status
{
  "kind": 30300,
  "tags": [
    ["d", "work:merge-456"],
    ["status", "in_progress"],
    ["claimed-by", "agent-worker-2"]
  ]
}

// Step 5: Completion event
{
  "kind": 30302,
  "pubkey": "agent-worker-2",
  "tags": [
    ["e", "<work-event-id>"],
    ["work-id", "merge-456"],
    ["status", "completed"],
    ["result", "success"],
    ["completion-proof", "<git-commit-hash>"]
  ],
  "content": "Merge successful: commit abc123"
}
```

**Why Needed:** Solves Mailing Protocol problems 2 (queue routing) and 6 (message claiming). ILP provides economic commitment and atomic claim mechanism.

**Key Advantages:**
- ✅ Race-condition-free (earliest timestamp wins, cryptographically verifiable)
- ✅ Economic commitment (deposit prevents spam claims)
- ✅ Atomic lock (ILP PREPARE ensures money is locked during claim)
- ✅ Timeout mechanism (expired claims automatically release)
- ✅ Slash mechanism (failed work forfeits deposit)

---

### NIP-3004: Agent Coordination Messages

**Title:** Standardized Message Types for Multi-Agent Coordination

**Purpose:** Define message event kinds and semantics for agent workflow coordination.

**Status:** DRAFT - Custom NIP Required

**Event Kinds:**

| Kind | Name | Type | Description |
|------|------|------|-------------|
| 31000 | Agent Message | Parameterized Replaceable | Generic agent-to-agent message |
| 31100 | POLECAT_DONE | Regular | Worker signals completion |
| 31101 | MERGE_READY | Regular | Witness signals ready for merge |
| 31102 | MERGED | Regular | Refinery confirms merge success |
| 31103 | MERGE_FAILED | Regular | Refinery reports merge failure |
| 31104 | REWORK_REQUEST | Regular | Refinery requests rebase |
| 31105 | RECOVERED_BEAD | Regular | Witness recovered dead worker's task |
| 31106 | RECOVERY_NEEDED | Regular | Manual recovery required |
| 31107 | HELP | Regular | Request intervention |
| 31108 | HANDOFF | Regular | Session continuity |
| 21000 | Agent Nudge | Ephemeral | Real-time notification (not stored) |

**Message Structure:**

All coordination messages share common tags:

```json
{
  "kind": 311xx,
  "pubkey": "<sender-pubkey>",
  "tags": [
    ["p", "<recipient-pubkey>"],           // REQUIRED: Recipient
    ["message-type", "<type>"],            // REQUIRED: Message type identifier
    ["subject", "<subject-line>"],         // REQUIRED: Brief summary
    ["from", "<hierarchical-address>"],    // OPTIONAL: Sender's hierarchical address
    ["to", "<hierarchical-address>"],      // OPTIONAL: Recipient's hierarchical address
    ["priority", "<level>"],               // OPTIONAL: urgent|high|normal|low
    ["thread-id", "<thread-id>"],          // OPTIONAL: Conversation thread
    ["e", "<parent-event-id>", "", "root"], // OPTIONAL: Thread root
    ["e", "<reply-event-id>", "", "reply"], // OPTIONAL: Direct reply
    // Message-specific tags below
  ],
  "content": "<markdown-body>",
  "created_at": <timestamp>
}
```

**POLECAT_DONE (kind 31100):**

```json
{
  "kind": 31100,
  "pubkey": "<polecat-pubkey>",
  "tags": [
    ["p", "<witness-pubkey>"],
    ["message-type", "POLECAT_DONE"],
    ["subject", "POLECAT_DONE worker-1"],
    ["worker", "worker-1"],
    ["bead-id", "bd-a1b2"],
    ["task", "<task-event-id>"],
    ["branch", "feature-x"],
    ["commits", "3"],
    ["tests", "passed"]
  ],
  "content": "Work complete on bd-a1b2. All tests passing. Ready for merge."
}
```

**MERGE_READY (kind 31101):**

```json
{
  "kind": 31101,
  "pubkey": "<witness-pubkey>",
  "tags": [
    ["p", "<refinery-pubkey>"],
    ["message-type", "MERGE_READY"],
    ["subject", "MERGE_READY worker-1"],
    ["worker", "worker-1"],
    ["bead-id", "bd-a1b2"],
    ["task", "<task-event-id>"],
    ["branch", "feature-x"],
    ["verified", "clean-state"]
  ],
  "content": "Verified clean state. Worktree ready for merge queue."
}
```

**MERGED (kind 31102):**

```json
{
  "kind": 31102,
  "pubkey": "<refinery-pubkey>",
  "tags": [
    ["p", "<witness-pubkey>"],
    ["message-type", "MERGED"],
    ["subject", "MERGED worker-1"],
    ["worker", "worker-1"],
    ["bead-id", "bd-a1b2"],
    ["task", "<task-event-id>"],
    ["commit", "abc123def456"],
    ["branch", "main"]
  ],
  "content": "Successfully merged to main at commit abc123def456"
}
```

**HELP (kind 31107):**

```json
{
  "kind": 31107,
  "pubkey": "<agent-pubkey>",
  "tags": [
    ["p", "<mayor-pubkey>"],  // Escalate to Mayor
    ["message-type", "HELP"],
    ["subject", "HELP: Stuck on merge conflict"],
    ["priority", "urgent"],
    ["worker", "worker-1"],
    ["bead-id", "bd-a1b2"],
    ["error-type", "merge-conflict"],
    ["attempts", "3"]
  ],
  "content": "# Merge Conflict Help Needed\n\nTried 3 times to merge, conflicts in auth.go. Need human intervention."
}
```

**HANDOFF (kind 31108):**

```json
{
  "kind": 31108,
  "pubkey": "<agent-pubkey>",
  "tags": [
    ["p", "<agent-pubkey>"],  // To self or successor session
    ["message-type", "HANDOFF"],
    ["subject", "🤝 HANDOFF: Continue authentication work"],
    ["session-id", "session-123"],
    ["task", "<task-event-id>"],
    ["context-summary", "brief"],
    ["attached-molecule", "<molecule-event-id>"]
  ],
  "content": "# Session Handoff\n\nContext limit reached. Continuing work on authentication epic.\n\n## Progress:\n- OAuth2 integration 80% complete\n- JWT implementation done\n- Session management pending\n\n## Next Steps:\n1. Complete session management\n2. Add refresh token logic\n3. Write integration tests"
}
```

**Agent Nudge (kind 21000 - Ephemeral):**

```json
{
  "kind": 21000,
  "pubkey": "<sender-pubkey>",
  "tags": [
    ["p", "<recipient-pubkey>"],
    ["message-type", "NUDGE"],
    ["priority", "urgent"],
    ["ephemeral", "true"]
  ],
  "content": "Quick heads up: Deployment starting in 5 minutes"
}
```

**Why Needed:** Solves Mailing Protocol problem 3 (work coordination types). Standardizes message semantics across agent implementations.

---

### NIP-3005: Workflow Templates (Molecules)

**Title:** Reusable Workflow Templates for Structured Agent Work

**Purpose:** Define template-based work patterns (Gastown "Molecules") for common workflows.

**Status:** DRAFT - Custom NIP Required

**Event Kinds:**

| Kind | Name | Type | Description |
|------|------|------|-------------|
| 30500 | Molecule Template | Parameterized Replaceable | Workflow template definition |
| 30501 | Molecule Instance | Parameterized Replaceable | Active workflow from template |
| 30502 | Molecule Phase | Parameterized Replaceable | Current phase state |

**Molecule Template (kind 30500):**

```json
{
  "kind": 30500,
  "pubkey": "<template-author-pubkey>",
  "tags": [
    ["d", "molecule:feature-workflow"],
    ["name", "feature-workflow"],
    ["version", "1.0.0"],
    ["phase", "design", "1"],
    ["phase", "implement", "2"],
    ["phase", "test", "3"],
    ["phase", "review", "4"],
    ["phase", "deploy", "5"],
    ["transition", "design->implement", "design-complete"],
    ["transition", "implement->test", "code-complete"],
    ["transition", "test->review", "tests-passing"],
    ["transition", "review->deploy", "approved"],
    ["category", "feature-development"]
  ],
  "content": JSON.stringify({
    "description": "Standard feature development workflow",
    "phases": {
      "design": {
        "checklist": ["Requirements defined", "Architecture reviewed", "API contract agreed"],
        "exit_criteria": "design-complete"
      },
      "implement": {
        "checklist": ["Code written", "Unit tests added", "Documentation updated"],
        "exit_criteria": "code-complete"
      },
      "test": {
        "checklist": ["Unit tests pass", "Integration tests pass", "Manual testing done"],
        "exit_criteria": "tests-passing"
      },
      "review": {
        "checklist": ["Code review complete", "Security review done", "Performance validated"],
        "exit_criteria": "approved"
      },
      "deploy": {
        "checklist": ["Deployed to staging", "Smoke tests pass", "Deployed to production"],
        "exit_criteria": "complete"
      }
    }
  })
}
```

**Molecule Instance (kind 30501):**

```json
{
  "kind": 30501,
  "pubkey": "<agent-pubkey>",
  "tags": [
    ["d", "molecule-instance:auth-feature"],
    ["template", "<molecule-template-event-id>"],
    ["name", "auth-feature"],
    ["current-phase", "implement"],
    ["task", "<task-event-id>"],
    ["started", "1000"],
    ["status", "active"]
  ],
  "content": JSON.stringify({
    "context": "Implementing OAuth2 authentication",
    "phase_history": [
      {"phase": "design", "entered": 1000, "exited": 2000, "result": "complete"},
      {"phase": "implement", "entered": 2000, "current": true}
    ],
    "checklist_progress": {
      "design": {"complete": 3, "total": 3},
      "implement": {"complete": 1, "total": 3}
    }
  })
}
```

**Why Needed:** Solves Beads problem 2 (context management - molecules). Provides structured workflows that reduce context by following predefined patterns.

---

## Part 3 Summary: Required NIPs

| NIP | Title | Priority | Complexity | Impact |
|-----|-------|----------|------------|--------|
| **NIP-3001** | Task Management | **HIGH** | Medium | Enables core task tracking and dependencies |
| **NIP-3002** | Agent Directory | **HIGH** | Low | Enables human-readable addressing |
| **NIP-3003** | Work Queue Claiming | **HIGH** | High | Enables atomic work claiming with ILP |
| **NIP-3004** | Coordination Messages | **MEDIUM** | Low | Standardizes agent communication |
| **NIP-3005** | Workflow Templates | **LOW** | Medium | Adds structured workflows (nice-to-have) |

**Event Kind Allocation:**

```
Task Management:      30100-30109, 20100-20109
Agent Directory:      30200-30209
Work Queue Claiming:  30300-30309
Coordination Messages: 31000-31199, 21000-21099
Workflow Templates:   30500-30509
```

**Total Custom Event Kinds Needed: ~50** (within Nostr's custom range 30000-39999)

---

## Part 4: Implementation Roadmap

This section outlines the phased approach for building **Wasteland** - a network-native agent orchestration system on Crosstown (Nostr ILP).

### Overview: Six-Phase Approach

| Phase | Focus | Duration | Key Deliverables | Risk Level |
|-------|-------|----------|------------------|------------|
| **Phase 0** | Proof of Concept | 2-4 weeks | Validate core assumptions | LOW |
| **Phase 1** | Foundation | 6-8 weeks | Task management + Directory | LOW |
| **Phase 2** | Economic Layer | 8-10 weeks | ILP work claiming | MEDIUM |
| **Phase 3** | Agent Coordination | 10-12 weeks | Message types + Basic swarm | MEDIUM |
| **Phase 4** | Advanced Features | 6-8 weeks | Molecules + Optimization | LOW |
| **Phase 5** | Production Hardening | 8-10 weeks | Federation + Scaling | MEDIUM |

**Total Estimated Timeline:** 40-52 weeks (~10-12 months)

---

### Phase 0: Proof of Concept (2-4 weeks)

**Goal:** Validate that Nostr ILP can solve core Beads/Mailing problems before committing to full implementation.

**Scope:**
1. **Simple Task Event** - Create and query task events on Crosstown relay
2. **ILP-Gated Task Creation** - Pay to create task (validate ILP write gating works)
3. **Basic Work Claiming** - Two agents compete for same task, earliest timestamp wins
4. **Agent Directory Lookup** - Map hierarchical address to pubkey
5. **Direct Messaging** - Agent A sends message to Agent B via Nostr event

**Success Criteria:**
- ✅ Task events persist on Crosstown relay
- ✅ ILP payment required for task creation
- ✅ Race condition resolved (earliest claim wins)
- ✅ Directory lookup returns correct pubkey
- ✅ Messages delivered in real-time via WebSocket

**Deliverables:**
- TypeScript SDK: Basic Crosstown client with task/message/claim methods
- Demo script: Two agents competing for work, winner determined correctly
- Performance benchmark: Latency measurements (local vs network agents)
- Documentation: POC findings report with go/no-go recommendation

**Key Risks:**
- ⚠️ ILP claim lock mechanism might have unforeseen race conditions
- ⚠️ WebSocket delivery latency might be too high for agent coordination
- ⚠️ Event indexing performance might not scale

**Mitigation:**
- Build minimal test harness with controlled timing
- Measure latency against Gastown baseline (sub-ms local, ms+ acceptable for network)
- Test with 10+ concurrent agents claiming same work

**Decision Point:** GO/NO-GO based on POC results. If race conditions unsolvable or latency unacceptable, revise approach.

---

### Phase 1: Foundation (6-8 weeks)

**Goal:** Implement core NIPs for task management and agent identity.

**NIPs Implemented:**
- ✅ **NIP-3001**: Agent Task Management (tasks, dependencies, wisps)
- ✅ **NIP-3002**: Agent Directory Service (hierarchical addressing)

**Scope:**

**Week 1-2: NIP-3001 Specification & Implementation**
- Finalize event kind definitions (30100-30109, 20100-20109)
- Implement task event schema with full tag validation
- Build dependency graph traversal logic (client-side)
- Create "ready tasks" query helper (find unblocked tasks)
- Add ephemeral wisp support (kind 20100)

**Week 3-4: NIP-3002 Specification & Implementation**
- Design agent profile schema (kind 30200)
- Implement rig directory (kind 30201) and town directory (kind 30202)
- Build address resolution algorithm (hierarchical → pubkey)
- Add mailing list support (kind 30203)
- Integrate NIP-05 for DNS-based identity

**Week 5-6: Integration & Testing**
- Build Wasteland SDK v0.1 (TypeScript)
  - `WastelandClient` class
  - Task management methods (`createTask`, `updateTask`, `queryReady`)
  - Directory methods (`resolveAddress`, `publishDirectory`)
- Create test suite with 100+ test cases
- Write NIP documentation in Nostr NIP format

**Week 7-8: Agent Framework Integration**
- Port 1-2 Gastown agents to Wasteland SDK (e.g., simple Polecat)
- Compare feature parity vs Gastown (track gaps)
- Performance testing: Task creation, query, dependency resolution
- Documentation: Developer guide + API reference

**Success Criteria:**
- ✅ NIP-3001 and NIP-3002 specifications published
- ✅ Full test coverage (>90%) for both NIPs
- ✅ SDK can create tasks, resolve dependencies, lookup agents
- ✅ At least 1 agent running on Wasteland SDK
- ✅ Performance: <100ms task creation, <50ms address resolution

**Deliverables:**
- NIP-3001 and NIP-3002 specification documents
- Wasteland SDK v0.1 (TypeScript package published to npm)
- Test suite with CI/CD integration
- Developer documentation site
- Demo: Single agent creating tasks with dependencies

**Key Risks:**
- ⚠️ Dependency graph complexity might require server-side indexing
- ⚠️ Directory lookup latency could accumulate in message routing

**Mitigation:**
- Implement client-side caching for directory lookups (TTL: 5 minutes)
- Consider optional indexing service for complex dependency queries
- Monitor query performance, optimize relay indexing if needed

---

### Phase 2: Economic Coordination (8-10 weeks)

**Goal:** Implement ILP-gated work claiming with atomic locks and economic incentives.

**NIPs Implemented:**
- ✅ **NIP-3003**: Work Queue Claiming with ILP Lock

**Scope:**

**Week 1-3: ILP Integration with Crosstown**
- Extend Crosstown BLS to support claim PREPARE packets
- Implement claim escrow (hold PREPARE without fulfilling)
- Add claim validation logic (verify deposit amount, timeout)
- Build fulfillment/reject logic based on work completion
- Create ILP address mapping for agents (integrate with NIP-3002)

**Week 4-5: NIP-3003 Specification & Implementation**
- Design work item schema (kind 30300)
- Implement claim lock schema (kind 30301)
- Build atomic claiming protocol (8-step flow)
- Add timeout and slash mechanisms
- Implement claim conflict resolution (earliest timestamp wins)

**Week 6-7: Economic Model Design**
- Define pricing model for work items
  - Base reward (completion payment)
  - Claim deposit (anti-spam, slashable)
  - Timeout parameters (claim expiry)
- Implement payment routing (ILP PREPARE → FULFILL flow)
- Add slash logic (forfeit deposit on failure)
- Create balance tracking and reporting

**Week 8-10: Integration & Testing**
- Build work queue demo with 5+ agents competing
- Test race conditions (10+ simultaneous claims)
- Test timeout scenarios (agent claims but doesn't complete)
- Test slash scenarios (agent fails work, deposit forfeited)
- Performance testing: Claim latency, throughput
- Economic simulation: Model agent behavior with incentives

**Success Criteria:**
- ✅ NIP-3003 specification published
- ✅ Zero claim race conditions (earliest timestamp always wins)
- ✅ ILP payments flow correctly (PREPARE → FULFILL or REJECT)
- ✅ Timeout mechanism works (expired claims release work)
- ✅ Slash mechanism works (failed work forfeits deposit)
- ✅ Performance: <500ms claim resolution, <1s payment settlement

**Deliverables:**
- NIP-3003 specification document
- Wasteland SDK v0.2 with work queue methods
- Crosstown BLS v1.5 with claim escrow support
- Economic model documentation
- Demo: 10 agents competing for work queue with payments
- Performance report: Claim resolution latency, payment throughput

**Key Risks:**
- ⚠️ **CRITICAL**: Clock skew between agents could affect timestamp ordering
- ⚠️ ILP settlement failures could leave claims in limbo
- ⚠️ Slash mechanism might be exploitable (malicious work publishers)

**Mitigation:**
- Use relay timestamp (not client timestamp) for canonical claim ordering
- Implement payment timeout and auto-refund logic
- Add reputation system for work publishers (Phase 3+)
- Multi-signature escrow for high-value work (future enhancement)

---

### Phase 3: Agent Coordination (10-12 weeks)

**Goal:** Implement standardized coordination messages and build basic multi-agent swarm.

**NIPs Implemented:**
- ✅ **NIP-3004**: Agent Coordination Messages

**Scope:**

**Week 1-3: NIP-3004 Specification & Implementation**
- Define all message event kinds (31100-31108, 21000)
- Implement message schemas for each type:
  - POLECAT_DONE, MERGE_READY, MERGED, MERGE_FAILED
  - REWORK_REQUEST, RECOVERED_BEAD, RECOVERY_NEEDED
  - HELP, HANDOFF
- Add message routing logic (direct, queue, broadcast)
- Implement priority handling (urgent/high/normal/low)
- Add threading support (NIP-10 integration)

**Week 4-6: Agent Roles Implementation**
- **Witness Agent**: Monitor polecat health, send MERGE_READY
- **Refinery Agent**: Process merge queue, send MERGED/MERGE_FAILED
- **Polecat Agent**: Execute work, send POLECAT_DONE
- **Mayor Agent**: Coordinate cross-rig work, handle HELP escalations
- **Deacon Agent**: Watchdog for Witness, send health alerts

**Week 7-9: Swarm Orchestration**
- Implement lifecycle management:
  - Agent startup/shutdown
  - Health monitoring
  - Recovery from failures
- Build work dispatch system:
  - Mayor assigns work to Polecats
  - Witness monitors completion
  - Refinery merges results
- Add handoff mechanism (session continuity)

**Week 10-12: Integration & Testing**
- Build complete workflow: Work creation → Assignment → Execution → Merge
- Test multi-agent scenarios (5 Polecats, 1 Witness, 1 Refinery, 1 Mayor)
- Test failure scenarios (dead Polecat recovery, merge conflicts)
- Test handoff scenarios (agent session expires, continues seamlessly)
- Performance testing: End-to-end workflow latency
- Compare vs Gastown baseline (feature parity check)

**Success Criteria:**
- ✅ NIP-3004 specification published
- ✅ All 5 agent roles implemented and functional
- ✅ Complete workflow executes without manual intervention
- ✅ Failure recovery works (dead agents detected, work recovered)
- ✅ Handoff works (session continuity across agent restarts)
- ✅ Performance: <5s end-to-end workflow (simple task)

**Deliverables:**
- NIP-3004 specification document
- Wasteland SDK v0.3 with coordination message support
- 5 agent role implementations (Witness, Refinery, Polecat, Mayor, Deacon)
- Swarm orchestration framework
- Demo: 10-agent swarm completing work autonomously
- Feature parity matrix vs Gastown

**Key Risks:**
- ⚠️ Message delivery guarantees (what if agent misses message?)
- ⚠️ Thundering herd (all agents react to same event simultaneously)
- ⚠️ Split brain (two agents think they're Mayor)

**Mitigation:**
- Implement message acknowledgment and retry logic
- Add rate limiting and backoff for event processing
- Use economic commitment (ILP lock) for leader election
- Add health check heartbeats and failover logic

---

### Phase 4: Advanced Features (6-8 weeks)

**Goal:** Implement workflow templates (Molecules) and optimize performance.

**NIPs Implemented:**
- ✅ **NIP-3005**: Workflow Templates (Molecules)

**Scope:**

**Week 1-3: NIP-3005 Specification & Implementation**
- Define molecule template schema (kind 30500)
- Define molecule instance schema (kind 30501)
- Implement phase transitions and state machine
- Add checklist tracking and progress reporting
- Build template library (common workflows)

**Week 4-5: Performance Optimization**
- Profile critical paths (task creation, message routing, claim resolution)
- Optimize relay queries (add indexes, batch requests)
- Implement client-side caching (directory, tasks, messages)
- Add subscription management (reduce WebSocket overhead)
- Optimize event serialization (consider TOON format)

**Week 6-8: Developer Experience**
- Build CLI tool (wasteland-cli) for agent management
- Add debugging tools (trace message flows, visualize dependency graph)
- Create agent templates/scaffolding (quick start)
- Write comprehensive documentation (guides, examples, API reference)
- Build dashboard (monitor swarm health, view metrics)

**Success Criteria:**
- ✅ NIP-3005 specification published
- ✅ Molecules reduce context window by 30%+ (vs raw tasks)
- ✅ Performance improved 2x vs Phase 3 (optimized queries)
- ✅ CLI tool allows easy agent deployment
- ✅ Dashboard provides real-time swarm visibility

**Deliverables:**
- NIP-3005 specification document
- Wasteland SDK v0.4 with molecule support
- wasteland-cli tool (npm package)
- Wasteland Dashboard (web app)
- Performance optimization report
- Complete developer documentation site

**Key Risks:**
- ⚠️ Molecules might be too rigid (not flexible enough for real work)
- ⚠️ Performance bottlenecks might be relay-side (out of our control)

**Mitigation:**
- Make molecules optional (agents can use raw tasks)
- Contribute relay optimizations to Crosstown project
- Consider running dedicated high-performance relay for Wasteland

---

### Phase 5: Production Hardening (8-10 weeks)

**Goal:** Prepare for production deployment with federation, scaling, and monitoring.

**Scope:**

**Week 1-3: Federation & Multi-Town Support**
- Implement cross-town work dispatch (NIP-90 DVMs + ILP)
- Add trust network (NIP-02 social graph integration)
- Build settlement negotiation (find common payment chains)
- Implement peer discovery (genesis peers, ArDrive registry)
- Add relay selection logic (data sovereignty, regional compliance)

**Week 4-6: Scaling & Reliability**
- Load testing (100+ agents, 1000+ tasks)
- Identify bottlenecks (relay, ILP connector, client)
- Implement horizontal scaling (multiple relays, sharding)
- Add failover and redundancy (agent recovery, relay fallback)
- Optimize for large dependency graphs (server-side indexing?)

**Week 7-8: Monitoring & Observability**
- Add metrics (task throughput, message latency, claim success rate)
- Implement distributed tracing (track work across agents)
- Build alerting (dead agents, payment failures, relay issues)
- Create operational runbooks (deployment, troubleshooting)
- Add security scanning (event validation, rate limiting)

**Week 9-10: Production Readiness**
- Security audit (especially ILP claim mechanism)
- Stress testing (failure scenarios, adversarial agents)
- Documentation review (completeness, accuracy)
- Migration guide (Gastown → Wasteland)
- Production deployment checklist

**Success Criteria:**
- ✅ Cross-town work dispatch functional (Town A → Town B)
- ✅ System scales to 100+ agents with acceptable performance
- ✅ Monitoring catches issues before they impact users
- ✅ Security audit passes (no critical vulnerabilities)
- ✅ Migration path from Gastown is clear and tested

**Deliverables:**
- Wasteland SDK v1.0 (production-ready)
- Federation guide (multi-town deployment)
- Scaling guide (performance tuning, capacity planning)
- Monitoring and alerting setup (Prometheus, Grafana)
- Security audit report
- Production deployment documentation
- Migration guide (Gastown → Wasteland)

**Key Risks:**
- ⚠️ **CRITICAL**: Security vulnerabilities in ILP claim mechanism
- ⚠️ Scaling limits hit before 100 agents (relay bottleneck)
- ⚠️ Migration from Gastown too complex (adoption barrier)

**Mitigation:**
- Third-party security audit early in phase
- Benchmark against known relay performance limits
- Build migration tooling (convert Gastown beads → Wasteland events)
- Provide dual-mode agents (work on both Gastown and Wasteland)

---

## Phase Dependencies

```
Phase 0 (POC)
    ↓
Phase 1 (Foundation: NIP-3001, NIP-3002)
    ↓
Phase 2 (Economic: NIP-3003)
    ↓
Phase 3 (Coordination: NIP-3004)
    ↓
    ├→ Phase 4 (Advanced: NIP-3005, Optimization)
    └→ Phase 5 (Production: Federation, Scaling)

Phase 4 and 5 can partially overlap
```

**Critical Path:** Phase 0 → Phase 1 → Phase 2 → Phase 3 (32-38 weeks minimum)

**Parallel Work:** Phase 4 and 5 can begin once Phase 3 is stable

---

## Recommended Proof of Concept (Phase 0 Detail)

**2-Week Sprint to Validate Core Assumptions**

### Week 1: Basic Infrastructure

**Day 1-2: Crosstown Setup**
- Deploy local Crosstown relay (Docker)
- Configure ILP connector with mock settlement
- Create 2 agent keypairs (agent-a, agent-b)
- Fund agents with test ILP units

**Day 3-4: Task Events**
```typescript
// Create simple task event
const task = await wasteland.createTask({
  title: "Test task",
  description: "Validate task creation",
  status: "open"
});

// Query task back
const retrieved = await wasteland.getTask(task.id);
console.log("Task retrieved:", retrieved);
```

**Day 5: ILP-Gated Creation**
```typescript
// Task creation requires ILP payment
const task = await wasteland.createTask({
  title: "Paid task",
  status: "open"
}, {
  ilpPayment: {
    amount: 100,  // 100 ILP units
    destination: relayILPAddress
  }
});
// Should succeed if payment valid, fail otherwise
```

### Week 2: Claiming & Messaging

**Day 1-3: Work Queue Claiming**
```typescript
// Publisher creates work
const work = await wasteland.publishWork({
  queue: "test-queue",
  reward: 1000,
  claimDeposit: 100
});

// Agent A and Agent B both try to claim
const claimA = await agentA.claimWork(work.id);
const claimB = await agentB.claimWork(work.id);

// Validate: earliest timestamp wins
const winner = await wasteland.resolveClaimWinner(work.id);
console.log("Winner:", winner);  // Should be A or B, not both
```

**Day 4: Directory Lookup**
```typescript
// Publish directory
await wasteland.publishDirectory({
  rig: "testrig",
  agents: [
    { name: "witness", pubkey: witnessKey },
    { name: "worker-1", pubkey: worker1Key }
  ]
});

// Resolve address
const pubkey = await wasteland.resolveAddress("testrig/witness");
console.log("Witness pubkey:", pubkey);
```

**Day 5: Direct Messaging**
```typescript
// Agent A sends message to Agent B
await agentA.sendMessage({
  to: "testrig/worker-1",
  subject: "Test message",
  content: "Hello from Agent A",
  priority: "normal"
});

// Agent B receives via subscription
agentB.onMessage((msg) => {
  console.log("Received:", msg.subject, msg.content);
});
```

### POC Success Metrics

**Must Pass:**
- ✅ Tasks persist on relay (can create and retrieve)
- ✅ ILP payment required (creation fails without valid payment)
- ✅ Claim winner deterministic (same winner every test run)
- ✅ Directory lookup works (correct pubkey returned)
- ✅ Messages delivered (Agent B receives what Agent A sent)

**Nice to Have:**
- ✅ <100ms task creation latency
- ✅ <500ms claim resolution latency
- ✅ <50ms directory lookup latency
- ✅ <200ms message delivery latency

**Red Flags (GO → NO-GO):**
- ❌ Claim winner non-deterministic (different winner on repeat)
- ❌ Messages lost or duplicated
- ❌ Latency >1s for any operation
- ❌ ILP payment mechanism fundamentally broken

---

## Implementation Resources Required

### Development Team (Minimum)

| Role | Phase 0 | Phase 1-2 | Phase 3-4 | Phase 5 |
|------|---------|-----------|-----------|---------|
| **Protocol Engineer** (TypeScript/Nostr/ILP) | 1 FTE | 1 FTE | 1 FTE | 0.5 FTE |
| **Agent Developer** (TypeScript/AI) | - | 0.5 FTE | 2 FTE | 1 FTE |
| **DevOps/Infrastructure** | - | 0.25 FTE | 0.5 FTE | 1 FTE |
| **Security Engineer** | - | - | 0.25 FTE | 1 FTE |
| **Technical Writer** | - | 0.25 FTE | 0.25 FTE | 0.5 FTE |

**Total FTE:** 1 (Phase 0) → 2 (Phase 1-2) → 4 (Phase 3-4) → 4 (Phase 5)

### Infrastructure

- **Development**: 3-5 VMs (relays, connectors, test agents)
- **Testing**: Load testing environment (10-100 agents)
- **Production**: 5-10 relays (geographic distribution), ILP connectors, monitoring stack

### External Dependencies

- **Crosstown**: Active development, responsive maintainers (it's your project!)
- **Nostr Ecosystem**: Relay implementations, client libraries
- **ILP Infrastructure**: Connector software, settlement chains

---

## Roadmap Mapping: What Replaces What

### NIP to Problem Mapping

| NIP | Replaces | Beads or Mailing? | Specific Problems Solved |
|-----|----------|-------------------|--------------------------|
| **NIP-3001** | Beads core functionality | **BEADS** | ✅ Multi-agent coordination (cryptographic IDs)<br>✅ Long-horizon execution (dependencies)<br>✅ Context management (wisps, ephemeral events)<br>✅ Distributed workflow (immutable events)<br>✅ Audit trail (signatures) |
| **NIP-3002** | Mailing Protocol addressing | **MAILING** | ✅ Hierarchical addressing (directory lookup)<br>✅ Agent identity (pubkey mapping)<br>✅ Mailing lists (fan-out) |
| **NIP-3003** | Beads + Mailing (hybrid) | **BOTH** | ✅ Work queue claiming **(Mailing)**<br>✅ Atomic coordination **(Beads)**<br>✅ Economic incentives **(NEW - ILP)** |
| **NIP-3004** | Mailing Protocol messages | **MAILING** | ✅ Inter-agent messaging<br>✅ Work coordination types<br>✅ Priority handling<br>✅ Thread tracking |
| **NIP-3005** | Beads advanced features | **BEADS** | ✅ Workflow templates (molecules)<br>✅ Context optimization |

### Phase to Functionality Mapping

**Phase 0: POC (Validates Both)**
- **Beads**: Task creation, persistence, querying
- **Mailing**: Message delivery, address resolution
- **ILP**: Payment-gated operations

**Phase 1: Foundation**
- **Primary: BEADS REPLACEMENT**
  - NIP-3001 = Core task management (replaces Beads issues, dependencies, wisps)
  - Task CRUD operations
  - Dependency graph
  - Ephemeral tasks (wisps)
- **Secondary: MAILING REPLACEMENT**
  - NIP-3002 = Agent directory (replaces Gastown's hierarchical addressing)
  - Address → pubkey mapping
  - Rig/Town directories

**Phase 2: Economic Coordination**
- **Primary: MAILING REPLACEMENT**
  - NIP-3003 = Work queue claiming (replaces Gastown's queue routing)
  - Queue message claiming
  - Work distribution
- **Secondary: BEADS ENHANCEMENT**
  - Atomic work coordination
  - Economic incentives (NEW capability)
  - Slash mechanism for accountability

**Phase 3: Agent Coordination**
- **Primary: MAILING REPLACEMENT**
  - NIP-3004 = Coordination messages (replaces Gastown's message types)
  - POLECAT_DONE, MERGE_READY, etc.
  - Direct/broadcast routing
  - Priority delivery
- **Secondary: AGENT ORCHESTRATION (NEW)**
  - Agent roles (Witness, Refinery, Polecat, Mayor, Deacon)
  - Lifecycle management
  - Health monitoring

**Phase 4: Advanced Features**
- **Primary: BEADS REPLACEMENT**
  - NIP-3005 = Molecules (replaces Gastown's workflow templates)
  - Context optimization
  - Structured workflows
- **Secondary: PERFORMANCE (BOTH)**
  - Query optimization
  - Caching
  - Developer tools

**Phase 5: Production Hardening**
- **Primary: BEADS REPLACEMENT**
  - Federation (replaces Dolt remotes)
  - Cross-town coordination
  - Data sovereignty
- **Secondary: SCALING (BOTH)**
  - Multi-relay distribution
  - Load balancing
  - Monitoring

---

## Functionality Replacement Timeline

### Beads Functionality Replacement

| Beads Feature | Replaced By | Phase | Timeline |
|---------------|-------------|-------|----------|
| **Issue tracking** | NIP-3001 tasks | Phase 1 | Week 6-8 |
| **Hash-based IDs** | Nostr event IDs | Phase 0 | Week 2-4 |
| **Dependencies** | NIP-3001 tags | Phase 1 | Week 6-8 |
| **Wisps (ephemeral)** | Ephemeral events | Phase 1 | Week 6-8 |
| **Content hashing** | Event signatures | Phase 0 | Week 2-4 |
| **Offline-first** | Offline signing | Phase 0 | Week 2-4 |
| **Audit trail** | Event immutability | Phase 0 | Week 2-4 |
| **Molecules** | NIP-3005 templates | Phase 4 | Week 34-40 |
| **Federation** | Multi-relay + ILP | Phase 5 | Week 40-48 |
| **Compaction** | Event expiry + summary | Phase 4 | Week 34-40 |

**Beads Replacement: 70% by Phase 1, 90% by Phase 4, 100% by Phase 5**

### Mailing Protocol Replacement

| Mailing Feature | Replaced By | Phase | Timeline |
|-----------------|-------------|-------|----------|
| **Direct messaging** | Nostr events + p tag | Phase 0 | Week 2-4 |
| **Hierarchical addresses** | NIP-3002 directory | Phase 1 | Week 6-8 |
| **Queue routing** | NIP-3003 claiming | Phase 2 | Week 12-20 |
| **Broadcast channels** | Nostr subscriptions | Phase 3 | Week 22-32 |
| **Message types** | NIP-3004 event kinds | Phase 3 | Week 22-32 |
| **Priority delivery** | Priority tags | Phase 3 | Week 22-32 |
| **Thread tracking** | NIP-10 references | Phase 3 | Week 22-32 |
| **Mailing lists** | NIP-3002 lists | Phase 1 | Week 6-8 |
| **Read status** | Client-side state | Phase 3 | Week 22-32 |
| **Interrupt delivery** | WebSocket push | Phase 0 | Week 2-4 |

**Mailing Replacement: 40% by Phase 1, 60% by Phase 2, 100% by Phase 3**

---

## Combined Replacement View

```
Phase 0 (POC): 2-4 weeks
├── Beads: 30% (basic task events, IDs, signatures)
└── Mailing: 20% (direct messages, delivery)

Phase 1 (Foundation): 6-8 weeks
├── Beads: 70% (tasks, dependencies, wisps, audit)
└── Mailing: 40% (addressing, directories, lists)

Phase 2 (Economic): 8-10 weeks
├── Beads: 75% (atomic coordination added)
└── Mailing: 60% (queue claiming, work distribution)

Phase 3 (Coordination): 10-12 weeks
├── Beads: 80% (agent orchestration)
└── Mailing: 100% (all message types, routing, priority)

Phase 4 (Advanced): 6-8 weeks
├── Beads: 90% (molecules, optimization)
└── Mailing: 100% (complete)

Phase 5 (Production): 8-10 weeks
├── Beads: 100% (federation, scaling)
└── Mailing: 100% (complete)
```

**Key Insight:** Mailing Protocol replacement completes by Phase 3 (~32 weeks), while Beads replacement requires all phases through Phase 5 (~48 weeks).

---

## What Gets Built When (Simplified)

**Phases 0-1 (Weeks 1-12):**
- ✅ **Foundation for both**
- 🎯 **Primary: Beads → Nostr events**
- 🎯 **Secondary: Mailing → Directory + addressing**

**Phase 2 (Weeks 13-22):**
- ✅ **Economic work claiming**
- 🎯 **Primary: Mailing → Queue routing**
- 🎯 **Secondary: ILP integration (NEW)**

**Phase 3 (Weeks 23-34):**
- ✅ **Agent coordination complete**
- 🎯 **Primary: Mailing → Message types (DONE)**
- 🎯 **Secondary: Agent swarm orchestration**

**Phases 4-5 (Weeks 35-52):**
- ✅ **Advanced features + production**
- 🎯 **Primary: Beads → Molecules, federation (DONE)**
- 🎯 **Secondary: Scaling, monitoring**

---

## Part 5: Risk Assessment & Mitigation

This section identifies critical risks across technical, economic, adoption, security, and operational dimensions, with mitigation strategies for each.

### Risk Assessment Framework

**Likelihood:** Low (10%) | Medium (30%) | High (60%)
**Impact:** Low (minor delay) | Medium (significant rework) | High (project failure)
**Priority:** Likelihood × Impact

---

## 1. Technical Risks

### RISK-T1: Clock Skew Affects Claim Ordering (NIP-3003)

**Description:** Agents with incorrect system clocks could win claims unfairly (timestamp manipulation).

**Likelihood:** Medium (30%) - Some systems have clock drift
**Impact:** High - Breaks claim fairness, economic incentives fail
**Priority:** **CRITICAL**

**Mitigation:**
1. **Use relay timestamp, not client timestamp** for canonical ordering
   - Relay assigns `received_at` timestamp on event ingestion
   - Client `created_at` used for sorting, but relay `received_at` is canonical
2. **Implement NTP verification** in agent framework
   - Warn agents if clock skew >1 second detected
   - Reject claims from agents with severe clock skew
3. **Add timestamp window validation** on relay
   - Reject events with `created_at` >5 seconds in future
   - Reject events with `created_at` >1 hour in past (for claims)
4. **Fallback: Multi-signature consensus** for high-value work
   - Multiple relays vote on claim winner
   - Consensus algorithm resolves conflicts

**Success Metric:** 99.9% claim consistency across clock skew scenarios in testing

---

### RISK-T2: Dependency Graph Complexity Overwhelms Clients

**Description:** Large task graphs (1000+ nodes) cause client-side traversal performance issues.

**Likelihood:** Medium (30%) - Large projects will hit this
**Impact:** Medium - Slow query performance, poor UX
**Priority:** **MEDIUM**

**Mitigation:**
1. **Server-side graph indexing** (optional relay enhancement)
   - Relay pre-computes "ready tasks" index
   - Clients query index instead of full graph
2. **Client-side caching** with aggressive TTL
   - Cache dependency resolution for 60 seconds
   - Invalidate on dependency update events
3. **Pagination and lazy loading**
   - Load tasks in batches (50 at a time)
   - Only load dependencies when task expanded
4. **Graph pruning heuristics**
   - Archive closed tasks after 30 days
   - Compact long chains into summary nodes

**Success Metric:** <200ms query time for graphs up to 5000 nodes

---

### RISK-T3: WebSocket Connection Instability

**Description:** Unreliable networks cause frequent WebSocket disconnects, messages lost.

**Likelihood:** High (60%) - Mobile agents, flaky networks
**Impact:** Medium - Messages missed, coordination broken
**Priority:** **HIGH**

**Mitigation:**
1. **Automatic reconnection with exponential backoff**
   - Reconnect on disconnect (1s, 2s, 4s, 8s, max 30s)
   - Resume subscriptions on reconnect
2. **Message acknowledgment protocol**
   - Critical messages (POLECAT_DONE, MERGED) require ACK
   - Sender retries if no ACK within timeout (30s)
3. **Relay-side message queuing**
   - Relay buffers messages for offline agents (up to 1 hour)
   - Agent fetches missed messages on reconnect
4. **Dual-relay redundancy**
   - Agents connect to 2+ relays simultaneously
   - Messages published to all relays
   - Deduplication on receive (by event ID)

**Success Metric:** 99.9% message delivery despite 50% connection drop rate

---

### RISK-T4: Nostr Relay Performance Bottleneck

**Description:** Relay can't handle query load from 100+ agents (indexing, filtering overhead).

**Likelihood:** Medium (30%) - Depends on relay implementation
**Impact:** High - System unusable at scale
**Priority:** **CRITICAL**

**Mitigation:**
1. **Benchmark relay performance early** (Phase 0)
   - Test with 100+ concurrent agents
   - Measure query latency under load
   - Identify bottlenecks (indexing, filtering, WebSocket overhead)
2. **Contribute optimizations to Crosstown relay**
   - Add indexes for common query patterns (by tag, by kind)
   - Optimize filter evaluation (bloom filters, inverted indexes)
   - Profile and optimize hot paths
3. **Horizontal scaling with sharding**
   - Shard tasks by rig (rig-1 → relay-1, rig-2 → relay-2)
   - Shard by event kind (tasks → relay-1, messages → relay-2)
   - Load balancer distributes agents across relays
4. **Fallback: Dedicated high-performance relay**
   - Fork Crosstown relay, optimize for Wasteland workload
   - Rust implementation for performance (vs TypeScript)
   - Custom indexing for agent-specific queries

**Success Metric:** <100ms p95 query latency with 200 concurrent agents

---

### RISK-T5: ILP Payment Failures Leave Orphaned Claims

**Description:** ILP PREPARE sent but never fulfilled/rejected, claim stuck in limbo.

**Likelihood:** Low (10%) - ILP designed for reliability
**Impact:** Medium - Work stuck, deposit locked
**Priority:** **LOW**

**Mitigation:**
1. **ILP expiry timeout** (built into protocol)
   - PREPARE packets expire after timeout (5 minutes default)
   - Expired packets auto-reject, deposit refunded
2. **Claim timeout monitoring**
   - Agent checks claim status every 30 seconds
   - If stuck >5 minutes, publish claim release event
3. **Relay-side claim garbage collection**
   - Relay auto-releases claims after timeout expiry
   - Claim status updated to "expired"
4. **Manual recovery mechanism**
   - Human operator can force-release stuck claims
   - Require multi-signature for safety

**Success Metric:** <1% claims stuck >timeout period

---

## 2. Economic Risks

### RISK-E1: ILP Payment Routing Failures

**Description:** Cross-town work dispatch fails because ILP connectors can't route payment.

**Likelihood:** Medium (30%) - Complex routing, path discovery
**Impact:** High - Cross-town collaboration broken
**Priority:** **HIGH**

**Mitigation:**
1. **SPSP peer discovery** (already in Crosstown)
   - Automatic discovery of payment routes
   - Settlement negotiation finds common chains
2. **Fallback payment paths**
   - Agent tries multiple payment routes
   - If Route A fails, try Route B, C, etc.
3. **Pre-established payment channels**
   - Towns that collaborate frequently pre-open channels
   - Reduces routing failures, improves latency
4. **Graceful degradation**
   - If ILP fails, fall back to trust-based coordination
   - IOU system with periodic settlement

**Success Metric:** 95% payment success rate for cross-town work

---

### RISK-E2: Economic Incentive Misalignment

**Description:** Agents game the system (claim work, don't complete, forfeit small deposit).

**Likelihood:** Medium (30%) - Incentive design is hard
**Impact:** Medium - Work queue clogged with fake claims
**Priority:** **MEDIUM**

**Mitigation:**
1. **Dynamic deposit scaling**
   - Deposit = f(reward, agent reputation, work complexity)
   - High-value work requires larger deposits
   - Low-reputation agents pay higher deposits
2. **Reputation system**
   - Track completion rate per agent
   - Penalize agents with <80% completion rate
   - Eventually ban repeat offenders (low reputation score)
3. **Exponential backoff on failures**
   - First failure: 5-minute cooldown
   - Second failure: 15-minute cooldown
   - Third failure: 1-hour cooldown, etc.
4. **Community moderation**
   - Work publishers can blacklist bad agents
   - Shared blacklists across towns

**Success Metric:** >90% claim-to-completion rate

---

### RISK-E3: ILP Fee Volatility Makes Micropayments Uneconomical

**Description:** ILP transaction fees exceed work rewards for small tasks.

**Likelihood:** Low (10%) - ILP designed for micropayments
**Impact:** Medium - Small tasks become uneconomical
**Priority:** **LOW**

**Mitigation:**
1. **Batching and netting**
   - Batch multiple small payments into one ILP packet
   - Net payments between agents (A owes B $5, B owes A $3 → net $2)
2. **Off-chain accounting** with periodic settlement
   - Track debts off-chain (in Nostr events)
   - Settle via ILP once accumulated >threshold (e.g., $10)
3. **Zero-fee payment channels** for frequent collaborators
   - Pre-fund channels between towns
   - In-channel transfers are free (no routing)
4. **Free tier for local coordination**
   - Same-rig agents don't pay each other
   - ILP only for cross-town work

**Success Metric:** <10% of reward consumed by fees

---

## 3. Adoption Risks

### RISK-A1: Migration Complexity from Gastown to Wasteland

**Description:** Migrating existing Gastown deployments is too complex, users don't adopt.

**Likelihood:** High (60%) - Migration is always hard
**Impact:** High - No adoption = project failure
**Priority:** **CRITICAL**

**Mitigation:**
1. **Build migration tooling** (Phase 5)
   - CLI tool: `wasteland migrate --from gastown --beads-db .beads/`
   - Converts Gastown beads → Wasteland events
   - Converts Gastown directories → NIP-3002 directories
   - Converts Gastown messages → NIP-3004 events
2. **Dual-mode agent framework**
   - Agents can run on both Gastown and Wasteland
   - Gradual migration: Start on Gastown, move to Wasteland
   - Hybrid mode: Some agents on Gastown, some on Wasteland
3. **Incremental migration path**
   - Phase 1: Run Wasteland alongside Gastown (observe)
   - Phase 2: Migrate non-critical work to Wasteland
   - Phase 3: Full cutover once confident
4. **Comprehensive migration guide**
   - Step-by-step instructions with examples
   - Troubleshooting section for common issues
   - Video walkthroughs

**Success Metric:** 80% of Gastown features migrated in <4 hours of effort

---

### RISK-A2: Developer Experience Worse Than Gastown

**Description:** Wasteland SDK is harder to use than Gastown, developers frustrated.

**Likelihood:** Medium (30%) - New system, learning curve
**Impact:** High - Poor DX = no adoption
**Priority:** **HIGH**

**Mitigation:**
1. **Developer-first SDK design** (Phase 1-4)
   - Simple, intuitive API (modeled after Gastown where possible)
   - Excellent TypeScript types and autocomplete
   - Comprehensive JSDoc comments
2. **Extensive documentation** (Phase 4-5)
   - Quick start guide (5-minute agent setup)
   - Step-by-step tutorials with real examples
   - API reference with live code samples
   - Architecture diagrams and concept explanations
3. **Agent templates and scaffolding**
   - `wasteland init --template polecat` generates starter code
   - Pre-built agent roles (Witness, Refinery, etc.)
   - Copy-paste examples for common patterns
4. **Interactive debugging tools** (Phase 4)
   - Dashboard visualizes agent communication
   - Trace message flows in real-time
   - Inspect event payloads and ILP payments
5. **Active community support**
   - Discord/Slack for developer questions
   - GitHub Discussions for Q&A
   - Office hours for 1:1 support

**Success Metric:** New developer builds first agent in <1 hour

---

### RISK-A3: Ecosystem Fragmentation (Incompatible Implementations)

**Description:** Multiple teams implement Wasteland NIPs differently, agents don't interoperate.

**Likelihood:** Medium (30%) - Common in decentralized protocols
**Impact:** Medium - Network effects reduced
**Priority:** **MEDIUM**

**Mitigation:**
1. **Rigorous NIP specifications** (Phase 1-3)
   - Formal schema definitions (JSON Schema for events)
   - Comprehensive test vectors (inputs → expected outputs)
   - Reference implementation (Wasteland SDK)
2. **Conformance test suite** (Phase 3-4)
   - Public test suite that implementations must pass
   - Automated CI checks for compliance
   - "Wasteland Certified" badge for compliant implementations
3. **Interoperability testing** (Phase 4-5)
   - Multi-implementation test events
   - Cross-implementation agent swarms
   - Identify and fix compatibility issues
4. **Governance process** for NIP updates
   - Public discussion before changes
   - Backwards compatibility requirements
   - Deprecation timeline for breaking changes

**Success Metric:** 95% interoperability across 3+ independent implementations

---

## 4. Security Risks

### RISK-S1: Claim Deposit Theft via Race Condition Exploit

**Description:** Attacker exploits race condition to claim work without locking deposit.

**Likelihood:** Low (10%) - Requires protocol flaw
**Impact:** High - Economic security broken
**Priority:** **MEDIUM**

**Mitigation:**
1. **Third-party security audit** (Phase 5)
   - Hire professional security auditors
   - Focus on NIP-3003 ILP claim mechanism
   - Penetration testing for race conditions
2. **Formal verification** of claim protocol
   - Mathematically prove claim invariants:
     - "Only one agent can claim work at a time"
     - "Deposit is always locked before claim accepted"
   - Use TLA+ or similar formal methods
3. **Bug bounty program** (Phase 5)
   - Reward security researchers for finding exploits
   - $5,000-$50,000 for critical vulnerabilities
4. **Gradual rollout with limits**
   - Phase 5: Start with low claim deposits ($1-$10)
   - Monitor for exploits in wild
   - Increase limits gradually as confidence grows

**Success Metric:** Zero successful exploits in 6 months of production use

---

### RISK-S2: Sybil Attack on Work Queues

**Description:** Attacker creates 1000 agents, claims all work, DoS the system.

**Likelihood:** Medium (30%) - Common attack on decentralized systems
**Impact:** High - System unusable
**Priority:** **HIGH**

**Mitigation:**
1. **ILP deposit as Sybil resistance** (built into NIP-3003)
   - Each claim requires deposit payment
   - Creating 1000 agents = paying 1000 deposits
   - Deposits slashed if work not completed → expensive attack
2. **Rate limiting per pubkey**
   - Max 10 claims per agent per hour
   - Max 3 concurrent claims per agent
   - Prevents single agent from monopolizing queue
3. **Reputation weighting**
   - High-reputation agents get priority in claim resolution
   - New agents (potential Sybils) wait longer
4. **Work publisher controls**
   - Publishers can whitelist specific agents
   - Publishers can set minimum reputation threshold
5. **ILP address verification**
   - Agents must prove control of ILP address (SPSP handshake)
   - Prevents fake ILP addresses

**Success Metric:** Sybil attack increases cost by 100x (makes attack uneconomical)

---

### RISK-S3: Private Key Compromise

**Description:** Agent's Nostr private key (nsec) stolen, attacker impersonates agent.

**Likelihood:** Medium (30%) - Key management is hard
**Impact:** High - Attacker can steal work, payments
**Priority:** **HIGH**

**Mitigation:**
1. **Hardware key support** (Phase 4-5)
   - NIP-07 browser extension integration
   - Hardware wallets (Ledger, Trezor) for signing
   - Never expose raw nsec to application code
2. **Key rotation capability**
   - Agent publishes "key revocation" event
   - New key references old key (chain of custody)
   - Relays reject events from revoked keys
3. **Multi-signature for high-value operations**
   - Large payments require 2+ signatures
   - Human approval for >$100 transactions
4. **Anomaly detection**
   - Monitor for unusual agent behavior (location change, sudden activity spike)
   - Alert on suspicious patterns
5. **Encrypted key storage**
   - Encrypt nsec with password (never store plaintext)
   - Use OS keychain (macOS Keychain, Windows Credential Manager)

**Success Metric:** <1% of agents experience key compromise per year

---

### RISK-S4: Relay Data Tampering

**Description:** Malicious relay modifies events before broadcasting (man-in-the-middle).

**Likelihood:** Low (10%) - Cryptographic signatures prevent this
**Impact:** Low - Clients detect and reject tampered events
**Priority:** **LOW**

**Mitigation:**
1. **Cryptographic signature verification** (built into Nostr)
   - Every event signed by author
   - Clients verify signature before accepting
   - Tampered events rejected automatically
2. **Multi-relay redundancy**
   - Publish events to multiple relays
   - Clients query multiple relays, compare results
   - Detect inconsistencies (relay A shows different data than relay B)
3. **Relay reputation system**
   - Track relay reliability and honesty
   - Blacklist relays caught tampering
   - Prefer high-reputation relays
4. **Gossiping protocol**
   - Relays share events with each other
   - Cross-verify data across relay network
   - Byzantine fault tolerance (majority voting)

**Success Metric:** 99.99% tamper detection rate

---

## 5. Operational Risks

### RISK-O1: Relay Infrastructure Availability

**Description:** Relay goes down, agents lose connection, coordination halted.

**Likelihood:** High (60%) - All services have downtime
**Impact:** Medium - Temporary disruption, recovers on reconnect
**Priority:** **MEDIUM**

**Mitigation:**
1. **Multi-relay architecture** (built into Nostr)
   - Agents connect to 3-5 relays simultaneously
   - If relay-1 down, use relay-2, relay-3, etc.
   - Zero single point of failure
2. **Relay health monitoring** (Phase 5)
   - Ping relays every 30 seconds
   - Detect downtime within 1 minute
   - Automatic failover to backup relays
3. **Relay SLA and redundancy**
   - Run 2+ relays in different data centers
   - Geographic distribution (US-East, EU-West, Asia-Pacific)
   - Load balancer with automatic failover
4. **Graceful degradation**
   - Agents queue messages locally when offline
   - Publish when reconnected
   - Work continues on available relays

**Success Metric:** 99.9% uptime (no more than 8 hours downtime per year)

---

### RISK-O2: ILP Connector Maintenance Burden

**Description:** Running ILP connector infrastructure is complex, requires specialized knowledge.

**Likelihood:** High (60%) - ILP is new technology
**Impact:** Medium - Operational overhead, staffing needs
**Priority:** **MEDIUM**

**Mitigation:**
1. **Managed ILP service** (Phase 5)
   - Wasteland provides hosted ILP connectors
   - SaaS model: pay per transaction
   - Eliminates self-hosting burden
2. **Comprehensive operational docs** (Phase 5)
   - Deployment guides (Docker, Kubernetes)
   - Configuration templates for common setups
   - Monitoring and alerting best practices
   - Troubleshooting runbooks
3. **Automated operations tooling**
   - Health checks and auto-recovery scripts
   - Log aggregation and analysis
   - Performance dashboards (Grafana)
4. **Community-run connectors**
   - Towns can share connector infrastructure
   - Community funding for shared resources

**Success Metric:** <4 hours/week maintenance time per connector

---

### RISK-O3: Protocol Upgrade Coordination

**Description:** Upgrading NIPs requires coordinating all agents, relays, connectors (hard fork risk).

**Likelihood:** High (60%) - Upgrades inevitable
**Impact:** Medium - Temporary network splits during upgrade
**Priority:** **MEDIUM**

**Mitigation:**
1. **Backwards compatibility by default**
   - New features are optional extensions
   - Old agents still work with new relays
   - Deprecation timeline: 6+ months warning
2. **Versioning in events**
   - Events include protocol version number
   - Agents negotiate capabilities (feature flags)
   - Gradual migration (support v1 and v2 simultaneously)
3. **Staged rollout**
   - Phase 1: Canary deployment (1% of agents)
   - Phase 2: Beta deployment (10% of agents)
   - Phase 3: Full rollout (100% of agents)
   - Rollback plan if issues detected
4. **Upgrade automation**
   - CLI tool: `wasteland upgrade --version 2.0`
   - Automatic relay upgrade (zero-downtime deployment)
   - Monitoring for upgrade success/failure

**Success Metric:** >95% successful upgrades without manual intervention

---

## Overall Risk Summary

### Critical Risks (Must Solve)

| Risk ID | Risk | Phase | Mitigation Priority |
|---------|------|-------|---------------------|
| **RISK-T1** | Clock skew breaks claim ordering | Phase 2 | Use relay timestamp |
| **RISK-T4** | Relay performance bottleneck | Phase 0 | Benchmark early |
| **RISK-A1** | Migration complexity | Phase 5 | Build migration tooling |
| **RISK-A2** | Poor developer experience | Phase 1-4 | Developer-first SDK |

### High Risks (Address Proactively)

| Risk ID | Risk | Phase | Mitigation Priority |
|---------|------|-------|---------------------|
| **RISK-T3** | WebSocket instability | Phase 0 | Auto-reconnect + ACKs |
| **RISK-E1** | ILP payment routing failures | Phase 2 | SPSP + fallback paths |
| **RISK-S2** | Sybil attack on queues | Phase 2 | ILP deposit + rate limits |
| **RISK-S3** | Private key compromise | Phase 4 | Hardware keys + rotation |

### Medium/Low Risks (Monitor)

All other risks have mitigation strategies and will be monitored throughout development.

---

## Go/No-Go Decision Criteria

After **Phase 0 (POC)**, evaluate against these criteria:

### GO Criteria (Proceed to Phase 1):
- ✅ Claim winner is deterministic (no race conditions)
- ✅ Relay handles 10+ concurrent agents without performance degradation
- ✅ ILP payment mechanism works reliably (>95% success rate)
- ✅ Message delivery <500ms latency
- ✅ No critical security vulnerabilities found

### NO-GO Criteria (Revisit approach):
- ❌ Claim races are non-deterministic or unsolvable
- ❌ Relay performance unacceptable (<5 agents before degradation)
- ❌ ILP integration fundamentally broken
- ❌ Latency >2 seconds (unusable for agent coordination)
- ❌ Critical security flaw with no known mitigation

---

## Conclusion: Risk-Adjusted Feasibility

**Overall Feasibility: ✅ HIGH (with risk mitigation)**

**Confidence Levels:**
- **Technical Feasibility**: 85% - Most risks have known mitigations
- **Economic Feasibility**: 75% - ILP integration novel but promising
- **Adoption Feasibility**: 70% - Migration complexity is solvable but challenging
- **Security Feasibility**: 80% - Cryptographic foundations strong, need audits
- **Operational Feasibility**: 75% - ILP operations add complexity but manageable

**Recommended Action:**
1. **Proceed with Phase 0 POC** (2-4 weeks, 1 developer)
2. **Validate critical risks** (RISK-T1, RISK-T4) in POC
3. **GO/NO-GO decision** after POC results
4. If GO → **Phase 1-5 full implementation** (40-52 weeks, 2-4 developers)

**Expected Outcome:**
- 75% probability of successful Wasteland deployment
- 20% probability of partial success (some features deferred)
- 5% probability of failure (fundamental blockers discovered in POC)

---

## Status: COMPLETE ✅
- [x] Part 1: Beads problem-solution mapping (7/7 problems analyzed)
- [x] Part 2: Mailing Protocol problem-solution mapping (10/10 problems analyzed)
- [x] Part 3: Required NIPs and Event Kinds (5 custom NIPs specified)
- [x] Part 4: Implementation Roadmap (6 phases, 40-52 weeks)
- [x] Part 4.5: Roadmap mapping (Beads vs Mailing replacement timeline)
- [x] Part 5: Risk Assessment & Mitigation (19 risks identified, all mitigated)

---

# FINAL RECOMMENDATION

## Can Crosstown (Nostr ILP) natively replace Beads + Mailing Protocol?

# ✅ YES - HIGHLY FEASIBLE

**Evidence:**
- **75% native solution coverage** across both systems
- **5 custom NIPs** required (all achievable)
- **Clear implementation path** (6 phases, ~12 months)
- **Known risks with mitigations** for all critical issues
- **NIP-3003 (ILP claim locks)** is breakthrough innovation - native Nostr+ILP synergy

**Breakthrough Insight:**
Using **ILP PREPARE packets as atomic claim locks** solves race conditions while adding economic accountability - this is a **native protocol-level solution** that couldn't exist in either Nostr or ILP alone. This validates the "native implementation" vision.

**Next Step:**
Execute **Phase 0 POC (2-4 weeks)** to validate assumptions before committing to full roadmap.

**If POC succeeds → Wasteland is viable as network-native agent orchestration platform.** 🚀
