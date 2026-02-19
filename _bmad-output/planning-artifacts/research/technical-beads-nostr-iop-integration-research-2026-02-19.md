---
stepsCompleted: [1, 2]
inputDocuments: []
workflowType: 'research'
lastStep: 2
research_type: 'technical'
research_topic: 'Network-Native Agent Orchestration: Replacing Gastown with Crosstown-based Architecture'
research_goals: 'Evaluate feasibility of replacing machine-based Gastown agent swarms with network-native agent orchestration running directly on Crosstown (ILP-gated Nostr Relay network). Research whether: (1) Beads functionality can be implemented natively using Nostr ILP primitives, (2) Gastown Mailing Protocol can be replaced with ILP-gated Nostr events, and (3) a distributed, decentralized agent swarm (Wasteland) can run at the network level rather than on individual machines'
user_name: 'Jonathan'
date: '2026-02-19'
web_research_enabled: true
source_verification: true
---

# Research Report: technical

**Date:** 2026-02-19
**Author:** Jonathan
**Research Type:** technical

---

## Research Overview

[Research overview and methodology will be appended here]

---

## Technical Research Scope Confirmation

**Research Topic:** Network-Native Agent Orchestration: Replacing Gastown with Crosstown-based Architecture

**Research Goals:** Evaluate feasibility of replacing machine-based Gastown agent swarms with network-native agent orchestration running directly on Crosstown (ILP-gated Nostr Relay network). Research whether: (1) Beads functionality can be implemented natively using Nostr ILP primitives, (2) Gastown Mailing Protocol can be replaced with ILP-gated Nostr events, and (3) a distributed, decentralized agent swarm (Wasteland) can run at the network level rather than on individual machines

**Technical Research Scope:**

- **Phase 1: Understanding Current Architecture** - What Beads and Mailing Protocol solve, Gastown primitives
- **Phase 2: Nostr ILP/Crosstown Native Capabilities** - ILP-gated relays, events, native patterns
- **Phase 3: Network-Native Beads Implementation** - Can Nostr ILP solve the same problems naturally?
- **Phase 4: Network-Native Agent Orchestration** - Distributed agent swarms on the network itself
- **Phase 5: Architectural Feasibility** - Natural fit, trade-offs, implementation roadmap

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights
- Problem-first thinking: Understanding what we're solving for before evaluating solutions

**Scope Confirmed:** 2026-02-19

---

## Technology Stack Analysis

### Current Architecture: Beads Technology Stack

**Programming Language & Runtime:**
- **Go 1.25.6** - Primary implementation language with auto-managed toolchain
- **CGO_ENABLED=1** - MANDATORY requirement for Dolt backend
- **Platform Support**: macOS, Linux, Windows, FreeBSD (cross-platform via goreleaser)

**Core Frameworks:**
- **Cobra 1.10.2** - CLI command framework
- **Viper 1.21.0** - Configuration management
- **Charmbracelet TUI Stack** - Terminal UI (glamour 0.10.0, huh 0.8.0, lipgloss 1.1.1, bubbletea)
- **Anthropic SDK Go 1.22.1** - Claude API integration for AI agents

**Database & Storage:**
- **Dolt v0.40.5** - Version-controlled SQL database with cell-level merge capability
- **go-sql-driver/mysql 1.9.3** - Dolt SQL driver
- **ncruces/go-sqlite3 0.30.5** - SQLite fallback (though Gastown uses Dolt exclusively)
- **JSONL Export Format** - Git-portable format (one entity per line, merge-friendly)

**Key Architecture Patterns:**
- **Hash-based IDs** (`bd-a1b2`) derived from UUIDs prevent collision in multi-agent scenarios
- **Content-based deduplication** via SHA256 hashing enables conflict-free distributed operation
- **Hierarchical IDs** for epics (`bd-a3f8.1`, `bd-a3f8.1.1`) support structured work decomposition
- **Dolt auto-commit** on every write creates complete audit trail
- **Three-layer architecture**: Storage (Dolt) → RPC (Unix sockets) → CLI (Cobra commands)

_Source: Local codebase analysis - `/Users/jonathangreen/Documents/beads/`_

### Current Architecture: Gastown Technology Stack

**Programming Language & Runtime:**
- **Go 1.24.2** - Primary implementation matching Beads ecosystem
- **Node.js 20+** - For certain integrations and tools

**Core Frameworks:**
- **Cobra 1.10.2** - CLI framework (consistent with Beads)
- **Bubbletea 1.3.10** - Terminal UI with Model-View-Update pattern
- **Bubbles 0.21.0** - Reusable TUI components
- **Lipgloss 1.1.1** & **Glamour 0.10.0** - Terminal styling and markdown rendering
- **go-rod 0.116.2** - Browser automation for web dashboard
- **gofrs/flock 0.13.0** - File locking for concurrent access

**Database & Persistence:**
- **Dolt SQL Server** - Single per-town server on port 3307 (NO SQLite fallback)
- **Branch-per-polecat** write strategy eliminates contention
- **Git worktrees** - Fundamental persistence mechanism (Propulsion Principle)
- **Town-level Beads**: `~/.gt/.beads/` (prefix `hq-*`) for cross-rig coordination
- **Rig-level Beads**: `<rig>/mayor/rig/.beads/` for project-specific work

**Agent Orchestration Architecture:**
```
Town Level (Cross-Rig)              Rig Level (Per-Project)
├── Mayor - Global coordinator      ├── Witness - Health monitoring
├── Deacon - Daemon watchdog        ├── Refinery - Merge queue mgmt
├── Boot - Deacon's watchdog        ├── Polecats - Worker agents
└── Dogs - Long-running workers     └── Crew - Human workspaces
```

**Mailing Protocol:**
- **Message Types**: POLECAT_DONE, MERGE_READY, MERGED, MERGE_FAILED, REWORK_REQUEST, RECOVERED_BEAD, RECOVERY_NEEDED, HELP, HANDOFF
- **Routing Modes**: Direct (agent-to-agent), Queue (unclaimed work), Broadcast (channels)
- **Storage**: All mail uses town beads (`type=message` beads) regardless of address
- **Addressing Format**: `<rig>/<role>`, `<rig>/<type>/<name>`, `list:<name>`, `queue:<name>`, `channel:<name>`

**Communication Mechanisms:**
- **Mail System** - Primary inter-agent messaging via beads (queue or interrupt delivery)
- **Nudging** - Real-time messaging with `gt nudge`
- **Handoff System** - Session continuity via `/handoff` command
- **Seance** - Query previous sessions for context

_Source: Local codebase analysis - `/Users/jonathangreen/Documents/Gastown/`_

### Target Architecture: Crosstown (Nostr + ILP) Technology Stack

**Programming Language & Runtime:**
- **TypeScript 5.3+** - Type-safe development
- **Node.js 20+ (LTS)** - JavaScript runtime
- **pnpm 8+** - Fast, disk-efficient package manager

**Core Libraries:**
- **nostr-tools 2.20+** - Official Nostr protocol reference implementation
- **@noble/ciphers 0.5.x** - NIP-44 encrypted messaging
- **@toon-format/toon 1.x** - Compact JSON encoding (5-10% smaller than JSON, LLM-optimized)
- **better-sqlite3 11.x** - Synchronous SQLite with excellent performance
- **ws 8.x** - WebSocket server for relay
- **Hono 4.x** - Lightweight, TypeScript-first HTTP server

**Monorepo Structure (4 Packages):**

| Package | Purpose | Technology |
|---------|---------|------------|
| **@crosstown/core** | Discovery & peering | Peer discovery, SPSP handshakes, trust calculation |
| **@crosstown/relay** | Nostr relay with gating | WebSocket server, SQLite event storage, NIP-01 protocol |
| **@crosstown/bls** | Business Logic Server | ILP payment verification, TOON encoding, event pricing |
| **@crosstown/examples** | Integration demos | End-to-end ILP-gated relay examples |

**Deployment Modes:**
1. **Embedded (Library)**: Import packages directly, ILP connector in-process, zero network latency
2. **Docker (Microservice)**: BLS HTTP server (port 3100) + WebSocket relay (port 7100), external ILP connector

_Source: Local codebase analysis - `/Users/jonathangreen/Documents/Crosstown/`_

### Nostr Protocol Architecture

**Core Design Principles:**
- **Decentralized event protocol** - No central authority or single point of failure
- **Simple client-server architecture** - Natural load balancing across hundreds of relays
- **WebSocket-based communication** - Real-time bidirectional protocol between clients and relays
- **JSON event structure** - Everything is an event carrying structured data

**Event Structure:**
- **kind field** - Defines event type (kind:1 = text notes, kind:0 = profile metadata, kind:4 = encrypted DMs)
- **Extensible through NIPs** - Nostr Improvement Proposals enable protocol evolution
- **Structured data support** - Events can contain complex data structures standardized via NIPs
- **Flexible data model** - Easily extensible for new functionalities (micropayments, chess moves, DVMs)

**Relay Infrastructure:**
- **Role**: Store and distribute events (decentralized glue)
- **Open-source implementations**: Rust, Go, Python
- **Client interaction**: Clients push events via WebSocket, relays broadcast to subscribed clients with relevant filters
- **Scaling**: Users spread across hundreds of relays, clients query dozens simultaneously

**Protocol Evolution (NIPs):**
- **NIP-01**: Basic protocol flow (WebSocket, event structure, relay communication)
- **NIP-02**: Follow lists / social graph
- **NIP-11**: Relay information document
- **NIP-44**: Encrypted messaging
- **Custom NIPs**: Extensible for domain-specific needs (e.g., Crosstown uses 10032, 23194, 23195 for ILP integration)

_Sources:_
- [Nostr Technical Architecture](https://onnostr.substack.com/p/nostrs-technical-architecture-the)
- [Nostr.com - Protocol Overview](https://nostr.com/)
- [Nostr Protocol GitHub](https://github.com/nostr-protocol/nostr)
- [NIP-01 Basic Protocol](https://nips.nostr.com/1)
- [Nostr Events Documentation](https://nostrbook.dev/protocol/event)
- [Nostr Schema](https://nostrify.dev/schema/)

### Interledger Protocol (ILP) Architecture

**Core Design Principles:**
- **Open protocol suite** for sending packets of value across different payment networks
- **Connector-based routing** - Connectors forward Prepare packets from senders to receivers
- **Atomic execution** - Fulfill or Reject packets relayed back to ensure payment certainty
- **Network-agnostic** - Interconnects all blockchains and value networks

**Payment Flow:**
1. **Sender** creates ILP PREPARE packet with payment amount and condition (hash)
2. **Connector** forwards packet through routing path
3. **Receiver** validates, fulfills condition, generates FULFILL packet
4. **Connector** relays FULFILL back to sender (or REJECT on failure)
5. **Atomic guarantee** - Payment succeeds only if all hops succeed

**ILP in Crosstown:**
- **"Pay to write, free to read"** - Writers pay per-byte via ILP, readers access free via Nostr WebSocket
- **TOON-encoded events** in ILP packets - Compact format embedded in PREPARE packet
- **Pricing models**: Per-byte pricing (e.g., 10 units/byte) or per-kind overrides
- **Validation ordering**: Parse TOON → verify signature → check payment → store (fail-fast)
- **Atomic payment + storage** - Money spent only if event successfully stored

_Sources:_
- [Interledger Protocol V4](https://interledger.org/developers/rfcs/interledger-protocol/)
- [Interledger Architecture](https://interledger.org/developers/rfcs/interledger-architecture/)
- [What is ILP and How Does It Work](https://cointelegraph.com/explained/what-is-the-interledger-protocol-and-how-does-it-work)
- [Interledger: Interconnecting All Blockchains](https://medium.com/xpring/interledger-how-to-interconnect-all-blockchains-and-value-networks-74f432e64543)

### Data Storage and Persistence Technologies

**Beads/Gastown Approach:**
- **Dolt** - Git-for-data SQL database with cell-level merge (better than line-based git)
- **JSONL** - Git-portable format (one entity per line, merge-friendly)
- **Git worktrees** - Persistent storage mechanism in Gastown (Propulsion Principle)
- **Auto-commit on write** - Complete audit trail with time-travel queries
- **Zero merge conflicts** - Content hashing + Dolt cell-level merge
- **Offline-first** - Works completely offline, `git push/pull` syncs across machines

**Crosstown/Nostr Approach:**
- **SQLite** - Fast, embedded relational database for event storage
- **TOON format** - Compact text encoding (5-10% smaller than JSON, human-readable)
- **WebSocket real-time** - Live event distribution to subscribed clients
- **Event immutability** - Events are content-addressable, cryptographically signed
- **Relay distribution** - Events naturally spread across multiple relays (no single source of truth)

**Comparison:**

| Feature | Beads/Gastown | Crosstown/Nostr |
|---------|---------------|-----------------|
| **Database** | Dolt (version-controlled SQL) | SQLite (fast embedded) |
| **Merge Strategy** | Cell-level merge (Dolt) | Event-based (no merge conflicts inherently) |
| **Sync Mechanism** | Git push/pull | Relay subscription + WebSocket |
| **Audit Trail** | Auto-commit every write | Event signatures + relay logs |
| **Offline Support** | Full offline capability | Clients cache, sync when online |
| **Data Format** | JSONL (line-oriented) | TOON/JSON (event-oriented) |

### Communication and Networking Technologies

**Gastown Mailing Protocol:**
- **Protocol**: Structured beads with `type=message`
- **Transport**: Local beads database (no network for co-located agents)
- **Addressing**: Hierarchical (`<rig>/<role>/<name>`, queues, channels)
- **Routing**: Three modes - direct, queue (unclaimed work), broadcast
- **Delivery**: Queue (periodic check) or Interrupt (system-reminder injection)
- **Latency**: Sub-millisecond for co-located agents
- **Format**: Subject + key-value body + markdown sections

**Nostr Event Protocol:**
- **Protocol**: JSON events with kind, content, tags, signature
- **Transport**: WebSocket (wss://) real-time bidirectional
- **Addressing**: Public key (npub/hex), relay URLs, event kinds for routing
- **Routing**: Subscribe to relay with filters (authors, kinds, tags, time ranges)
- **Delivery**: Push to subscribed clients in real-time
- **Latency**: Milliseconds to seconds (network-dependent)
- **Format**: Structured JSON with extensible tags array

**ILP Payment Protocol:**
- **Protocol**: ILP PREPARE/FULFILL/REJECT packets
- **Transport**: HTTP POST (e.g., `/handle-packet`) or BTP (bilateral transfer protocol)
- **Addressing**: ILP addresses (e.g., `g.<town>.<rig>.<role>`)
- **Routing**: Connectors route based on address prefixes
- **Guarantee**: Atomic (payment succeeds only if all hops succeed)
- **Latency**: Milliseconds (optimized for micropayments)
- **Format**: Binary packets with amount, condition (hash), data payload

### Integration Technologies and Patterns

**Crosstown's Hybrid Architecture (Research Phase):**

The Crosstown project has completed deep research on Gastown integration with the following findings:

**Identity Mapping:**
- **Nostr keypair ↔ Gastown agent** - Each agent gets npub/nsec for Nostr identity
- **ILP address mapping** - `g.<town-handle>.<rig>.<role>` tied to Nostr identity
- **Storage**: Nostr Identity Beads with encrypted nsec, ILP address, BTP endpoint
- **Feasibility**: HIGH - Straightforward mapping

**Communication Layer:**
- **Nostr events for inter-town mail** - Replace cross-machine communication with Nostr events
- **Local Gastown mail preserved** - Co-located agents keep existing hooks/nudges (sub-ms latency)
- **Hybrid approach** - Local for same-machine, Nostr for cross-machine
- **Feasibility**: HIGH - Natural protocol boundary

**Economic Model:**
- **ILP payments for inter-agent work** - Cross-town work dispatch via DVM + ILP
- **Payment locking**: Town A locks with ILP PREPARE
- **Payment release**: Town B completes work, Town A releases via ILP FULFILL
- **Feasibility**: MEDIUM - Requires payment channel infrastructure

**Decentralized Collaboration:**
- **NIP-34 for git operations** - Decentralized git collaboration over Nostr
- **NIP-90 DVMs** - Data Vending Machines for paid computation marketplace
- **Beads sync over Nostr** - JSONL export published as Nostr events
- **Feasibility**: MEDIUM-HIGH - Protocol support exists, integration effort required

**Cross-Town Federation:**
- **Peer discovery** - NIP-02 follow lists + SPSP handshakes
- **Trust calculation** - Social distance via follow graph
- **Settlement negotiation** - Find common settlement chains (EVM, XRP Ledger)
- **Feasibility**: MEDIUM - Complex trust and settlement infrastructure

_Source: `/Users/jonathangreen/Documents/Crosstown/docs/research/gastown-integration-analysis.md`_

### Technology Adoption Trends and Evolution

**Current State (2026):**
- **Nostr adoption** - Growing decentralized social protocol with active NIP development
- **ILP maturity** - Established protocol (V4) with connector implementations and settlement support
- **Agent orchestration** - Emerging pattern with Gastown as novel approach
- **Distributed work systems** - Increasing interest in decentralized, peer-to-peer coordination

**Migration Patterns:**
- **From centralized to decentralized** - Gastown → Wasteland represents this shift
- **From machine-based to network-based** - Single-machine swarms → network-native agents
- **From custom protocols to standards** - Mailing Protocol → Nostr events + ILP
- **From Git-based sync to real-time events** - JSONL push/pull → WebSocket subscriptions

**Emerging Technologies:**
- **TOON format** - LLM-optimized encoding gaining traction in agent systems
- **NIP extensibility** - Custom NIPs enable domain-specific Nostr applications
- **Economic coordination** - ILP micropayments enable new agent collaboration models
- **Hybrid architectures** - Local performance + network distribution

**Legacy Technology Considerations:**
- **Gastown's current value** - Proven agent orchestration, mature Beads integration, production-ready
- **Migration risk** - Replacing working system with experimental network-native approach
- **Incremental path** - Hybrid local+remote enables gradual migration

### Technology Stack Summary

| Component | Beads/Gastown | Crosstown/Nostr+ILP | Compatibility |
|-----------|---------------|---------------------|---------------|
| **Language** | Go 1.24-1.25 | TypeScript 5.3+ | Cross-language integration required |
| **Database** | Dolt (version SQL) | SQLite | Both SQL, different merge strategies |
| **Data Format** | JSONL | TOON/JSON | Both JSON-family, TOON more compact |
| **Communication** | Beads (local DB) | Nostr (WebSocket) | Hybrid approach possible |
| **Payments** | None native | ILP (micropayments) | New economic layer |
| **Distribution** | Git push/pull | Relay subscription | Different sync models |
| **Identity** | Agent names | Nostr keypairs | Mapping layer needed |
| **Orchestration** | Machine-based | Network-native (goal) | Architectural transformation |

**Key Technical Challenges:**
1. **Language boundary** - Go ↔ TypeScript integration (HTTP APIs, gRPC, or language-agnostic protocols)
2. **Data sync models** - Git-based (Gastown) vs event-based (Nostr) have different consistency guarantees
3. **Communication latency** - Sub-millisecond (local) vs millisecond+ (network) requires hybrid approach
4. **Economic layer** - Adding ILP payments changes agent coordination dynamics
5. **Trust infrastructure** - Nostr social graph trust different from Gastown's implicit trust

**Key Technical Opportunities:**
1. **Standards-based** - Nostr NIPs provide ecosystem, interoperability, community
2. **Decentralization** - Network-native agents enable true distributed swarms
3. **Economic coordination** - ILP enables paid cross-town work, reputation, resource allocation
4. **Extensibility** - Nostr's NIP process allows domain-specific extensions
5. **Scalability** - Relay distribution and network-native design scale beyond single-machine limits

## Integration Patterns Analysis

### API Design Patterns

**Beads CLI API Pattern:**
Beads implements a command-line API pattern where all commands support `--json` flag for programmatic access. This enables agent-friendly interaction without requiring a separate REST API layer. The CLI acts as the stable interface while the underlying storage (Dolt) can be accessed directly or via RPC (Unix sockets).

**Pattern**: Command-line as primary API, with JSON output for programmatic consumption.

**Nostr NIP-Based Extensibility:**
NIPs (Nostr Implementation Possibilities) document what may be implemented by Nostr-compatible relay and client software. NIPs ensure that a note posted from one client can be read on any other Nostr client, providing standardized interoperability. Key integration NIPs include:

- **NIP-01**: Basic protocol flow (WebSocket, event structure, relay communication)
- **NIP-96**: HTTP File Storage Integration (REST API for file servers)
- **Authentication**: Relays send AUTH challenges, clients sign with private keys, relays verify signatures

**Pattern**: Extensible protocol standards (NIPs) that ensure cross-implementation compatibility.

_Source: [GitHub - Nostr NIPs](https://github.com/nostr-protocol/nips), [Understanding NIPs](https://learnnostr.org/concepts/nips), [NIP-01](https://nips.nostr.com/1), [NIP-96 File Storage](https://nips.nostr.com/96)_

**ILP Multi-Layer Protocol Suite:**
The Interledger Protocol Suite is comprised of four layers:
1. **Application Layer**: SPSP (Simple Payment Setup Protocol) - communicates destination ILP address over HTTPS
2. **Transport Layer**: STREAM protocol for chunked payments and quoting
3. **Interledger Layer**: ILPv4 core packet routing (PREPARE/FULFILL/REJECT)
4. **Link Layer**: Ledger-specific settlement protocols

**Pattern**: Layered protocol architecture with clear separation of concerns (similar to OSI model).

_Sources: [Interledger Protocol V4](https://interledger.org/developers/rfcs/interledger-protocol/), [Interledger Architecture](https://interledger.org/developers/rfcs/interledger-architecture/), [ILP Overview](https://medium.com/xpring/interledger-how-to-interconnect-all-blockchains-and-value-networks-74f432e64543)_

**Crosstown ILP-Gated Relay API:**
Crosstown implements two distinct APIs:
1. **Write API (HTTP + ILP)**: `POST /handle-packet` receives ILP PREPARE packets with TOON-encoded events, validates payment, stores event, returns ILP FULFILL
2. **Read API (WebSocket + NIP-01)**: Standard Nostr relay protocol with `REQ` filters and `EVENT` responses, completely free

**Pattern**: Asymmetric API design - paid write via HTTP/ILP, free read via WebSocket/Nostr.

### Communication Protocols

**Gastown Mailing Protocol:**
Structured message-based communication via beads (`type=message`) with three routing modes:

1. **Direct Routing**: `<rig>/<role>/<name>` - Agent-to-agent communication
2. **Queue Routing**: `queue:<name>` - Unclaimed work that agents claim (first-come)
3. **Broadcast Routing**: `channel:<name>` - Publish-subscribe for announcements

**Delivery Mechanisms:**
- **Queue Delivery**: Agent checks periodically with `gt mail check`
- **Interrupt Delivery**: System-reminder injected into agent session (used for lifecycle events, URGENT priority)

**Message Format:**
```
Subject: TYPE_SUBTYPE <context>
Key: Value
Key2: Value2

Markdown section 1

Markdown section 2
```

**Protocol Characteristics**: Structured text format (human-debuggable), extensible message types, local database transport (sub-millisecond latency for co-located agents).

_Source: Local codebase analysis - Gastown mail protocol documentation_

**Nostr WebSocket Protocol:**
Real-time, bidirectional communication between clients and relays using WebSocket connections. WebSockets provide full-duplex, low-latency, event-driven connections with much lower overhead than half-duplex alternatives like HTTP long polling.

**Client-to-Relay Messages:**
- `EVENT` - Publish new event
- `REQ` - Subscribe to events matching filters
- `CLOSE` - Unsubscribe from subscription

**Relay-to-Client Messages:**
- `EVENT` - Deliver matching event to subscriber
- `EOSE` - End of stored events (historical events complete)
- `OK` - Confirm event accepted
- `AUTH` - Request authentication

**Protocol Characteristics**: Persistent connections, push-based delivery, filter-based subscriptions, cryptographically signed events.

_Sources: [5 Protocols for Event-Driven APIs](https://nordicapis.com/5-protocols-for-event-driven-api-architectures/), [WebSockets in Microservices](https://www.geeksforgeeks.org/system-design/websockets-in-microservices-architecture/), [Event-Driven Architecture with WebSockets](https://medium.com/@akshat.available/real-time-event-driven-architecture-with-kafka-websockets-and-react-b4698361e68a)_

**ILP Payment Protocol:**
Atomic micropayment protocol with three packet types:

1. **PREPARE Packet**: Contains payment amount, execution condition (hash), expiry time, destination ILP address, data payload (e.g., TOON-encoded Nostr event)
2. **FULFILL Packet**: Reveals fulfillment (preimage of condition hash), proves payment completion
3. **REJECT Packet**: Payment failed, includes error code and triggered-by address

**Routing**: Connectors forward PREPARE packets to destinations, relay FULFILL/REJECT back to senders. ILPv4 optimized for routing large volumes of low-value packets ("penny switching").

**Atomic Guarantee**: Payment succeeds only if all hops succeed (condition validated), otherwise fails atomically.

_Sources: [Interledger Protocol V4](https://interledger.org/developers/rfcs/interledger-protocol/), [ILP Micropayments](https://blog.mexc.com/glossary/interledger-protocol-ilp/), [What is ILP](https://www.tradingview.com/news/cointelegraph:1617684d2094b:0-what-is-the-interledger-protocol-and-how-does-it-work/)_

### Data Formats and Standards

**JSONL (JSON Lines):**
Beads and Gastown use JSONL for git-portable exports. Each line is a complete JSON object representing one entity (issue, dependency, comment). Benefits: merge-friendly (one entity per line), human-readable, streaming-friendly, git-compatible.

**Example**:
```jsonl
{"id":"bd-a1b2","title":"Task 1","status":"open"}
{"id":"bd-c3d4","title":"Task 2","status":"closed"}
```

**TOON (Compact JSON):**
Crosstown uses TOON format (5-10% smaller than JSON, LLM-optimized). Human-readable text format with more concise syntax than JSON. Example comparison: 327 bytes (TOON) vs 344 bytes (JSON) for a simple text note.

**Nostr Event JSON:**
Standardized JSON structure with required fields:
```json
{
  "id": "<event-hash>",
  "pubkey": "<author-public-key>",
  "created_at": <timestamp>,
  "kind": <event-type-number>,
  "tags": [["tag-name", "value"], ...],
  "content": "<event-content>",
  "sig": "<signature>"
}
```

**ILP Packet Binary Format:**
ILP uses binary packet encoding for efficiency. Packets contain:
- Amount (UInt64)
- Expiry timestamp
- Execution condition (32-byte hash)
- Destination ILP address (string)
- Data payload (arbitrary bytes, e.g., TOON-encoded event)

**Cross-Language Serialization:**
For TypeScript (Crosstown) ↔ Go (Beads/Gastown) integration:
- **JSON**: Universal interchange format, supported natively by both languages
- **Protocol Buffers**: High-performance binary serialization (not currently used but viable)
- **HTTP/REST**: Language-agnostic transport (JSON bodies)
- **gRPC**: Type-safe cross-language RPC (Go and TypeScript both have excellent support)

_Sources: [TypeScript-Go Context](https://www.infoworld.com/article/4100582/microsoft-steers-native-port-of-typescript-to-early-2026-release.html), [Why Go for TypeScript](https://github.com/microsoft/typescript-go/discussions/411)_

### System Interoperability Approaches

**Point-to-Point Integration (Current Gastown):**
Gastown agents communicate directly via shared beads database (town-level `~/.gt/.beads/`). This is extremely low-latency (sub-millisecond) but requires all agents to be co-located on the same machine or share a network-accessible Dolt SQL server.

**Characteristics**: High performance, simple architecture, limited to local or network-accessible database.

**Federated Computing (Crosstown/Nostr Model):**
Crosstown implements federated architecture principles:
1. **Distributed data assets**: Each relay stores its own events, data remains under local control
2. **Federated services**: Relays serve events, clients query multiple relays simultaneously
3. **Standardized APIs**: NIP-01 WebSocket protocol ensures interoperability
4. **Decentralized governance**: No central authority, relay operators set their own policies

**Peer Discovery**: Multi-layered approach:
- Genesis peers (hardcoded bootstrap)
- ArDrive registry (decentralized peer list on Arweave)
- NIP-02 social graph (follow lists)
- RelayMonitor (real-time kind:10032 subscription)

**Trust Calculation**: Social distance via follow graph, mutual follower scoring, trust-weighted credit limits.

_Sources: [Federated Computing](https://royalsocietypublishing.org/rsos/article/13/2/251318/480279/Federated-computing-information-integration-under), [Federated Architectures 2026](https://federalnewsnetwork.com/federal-insights/2026/01/5-technologies-drive-the-next-era-of-federal-systems-integration/), [API Federation](https://www.emergentmind.com/topics/federated-and-decentralized-architectures)_

**Hybrid Local + Remote Architecture (Proposed for Wasteland):**
Based on Crosstown's Gastown integration research, a hybrid approach is recommended:

- **Co-located agents**: Preserve existing Gastown communication (hooks, nudges, local mail) for sub-millisecond latency
- **Remote agents**: Use Nostr events + ILP for cross-machine coordination (millisecond+ latency acceptable)
- **Identity layer**: Nostr keypair ↔ Gastown agent mapping with ILP address
- **Economic layer**: ILP payments for cross-town work

**Pattern**: Choreography (decentralized peer-to-peer) for remote coordination, local optimization for co-located agents.

_Sources: [Distributed System Patterns](https://martinfowler.com/articles/patterns-of-distributed-systems/), [Choreography vs Orchestration](https://github.com/Sairyss/system-design-patterns)_

### Multi-Agent Integration Patterns

**Model Context Protocol (MCP):**
MCP is a universal framework (2026) standardizing how AI agents connect with tools, models, and systems. MCP facilitates:
- Contextual communication between agents
- Memory management across agent sessions
- Task planning and coordination
- Multi-agent orchestration across various AI models

**Multi-Agent Architectures:**
1. **Hierarchical**: Lead agent orchestrates specialized sub-agents (Gastown's Mayor → Deacon → Polecats)
2. **Peer-to-Peer**: Agents collaborate without direct control point (requires robust communication protocols)

**Agent Communication Standards:**
- **MCP** (Model Context Protocol): Universal agent-to-tool framework
- **ACP** (Agent Communication Protocol): Agent-to-agent messaging
- **A2A** (Agent-to-Agent): Direct agent communication
- **ANP** (Agent Negotiation Protocol): Coordination and negotiation
- **AG-UI**: Agent user interface standards

**W3C Agent Protocol Community Group**: Working toward official web standards for agent communication (specs expected 2026-2027).

**Gastown's Integration Pattern:**
Gastown implements a hierarchical multi-agent pattern with specialized roles:
- **Mayor**: Global coordinator with cross-rig visibility
- **Deacon**: Daemon watchdog (continuous patrol cycles)
- **Witness**: Monitors polecat health and cleanup
- **Refinery**: Manages merge queue
- **Polecats**: Worker agents with persistent identity

**Communication**: Mailing Protocol (message beads) with natural language support. MARL-based methods (Multi-Agent Reinforcement Learning) can be adapted using natural language as reasoning and communication interface.

_Sources: [MCP Multi-Agent AI 2026](https://onereach.ai/blog/mcp-multi-agent-ai-collaborative-intelligence/), [Top 5 Open Protocols for Multi-Agent AI](https://onereach.ai/blog/power-of-multi-agent-ai-open-protocols/), [Multi-Agent Systems Guide 2026](https://k21academy.com/agentic-ai/guide-to-multi-agent-systems-in-2026/), [AI Agent Protocols Complete Guide](https://www.ruh.ai/blogs/ai-agent-protocols-2026-complete-guide)_

### Event-Driven Integration

**Publish-Subscribe Pattern (Nostr):**
Nostr implements classic pub-sub pattern:
- **Publishers**: Clients create and sign events, publish to relays
- **Subscribers**: Clients subscribe to relays with filters (author, kind, tags, time)
- **Brokers**: Relays store events and broadcast to matching subscribers

**Characteristics**: Decoupled producers and consumers, topic-based routing (via kinds and tags), real-time delivery via WebSocket push.

**Event Sourcing (Beads/Dolt):**
Beads with Dolt implements event sourcing principles:
- Every write creates a Dolt commit (event)
- Complete audit trail with time-travel queries
- Event log can be replayed to reconstruct state
- JSONL export represents event stream

**Pattern**: Event log as source of truth, state derived from event history.

**Message Broker Pattern (Gastown Queues):**
Gastown implements message queue pattern for work distribution:
- **Queues**: `queue:<name>` - unclaimed work messages
- **Claiming**: Agent claims message with `ClaimedBy` and `ClaimedAt`
- **Delivery**: First-come-first-served

**Pattern**: Work queue for load balancing across multiple worker agents (Polecats).

**CQRS (Command Query Responsibility Segregation):**
Crosstown implements CQRS pattern:
- **Command (Write)**: ILP-gated HTTP API, payment required, validation + storage
- **Query (Read)**: Nostr WebSocket API, free access, subscription-based

**Pattern**: Separate write and read paths with different protocols, performance, and access controls.

_Sources: [Event-Driven Architecture Patterns](https://nordicapis.com/5-protocols-for-event-driven-api-architectures/), [Real-Time Event-Driven Architecture](https://medium.com/@akshat.available/real-time-event-driven-architecture-with-kafka-websockets-and-react-b4698361e68a), [Event Sourcing and CQRS](https://resources.fenergo.com/engineering-at-fenergo/working-with-event-sourcing-cqrs-and-web-sockets-on-aws)_

### Integration Security Patterns

**Cryptographic Signatures (Nostr):**
Every Nostr event is cryptographically signed with the author's private key (nsec). Relays and clients verify signatures before accepting events. This provides:
- **Authentication**: Proof of authorship
- **Integrity**: Event content hasn't been tampered with
- **Non-repudiation**: Author can't deny creating the event

**Pattern**: Digital signatures for decentralized authentication (no central authority required).

**Encrypted Messaging (NIP-44):**
Nostr supports end-to-end encrypted direct messages via NIP-44 using @noble/ciphers. Crosstown uses this for SPSP handshakes (kind:23194 request, kind:23195 response).

**Pattern**: Public key encryption for private communication on public relays.

**Economic Access Control (ILP Gating):**
Crosstown implements economic access control:
- **Write Access**: Must pay per-byte via ILP (Sybil resistance, spam prevention)
- **Read Access**: Free (maximize data availability)
- **Owner Exception**: Relay owner's events bypass payment (self-write)

**Pattern**: Payment as permission - economic cost prevents abuse without central gatekeeping.

**Mutual TLS & ILP Addressing:**
ILP addresses function as routing and security:
- **ILP Address**: `g.<town-handle>.<rig>.<role>` uniquely identifies payment destination
- **BTP (Bilateral Transfer Protocol)**: Can use mutual TLS for secure connector-to-connector links
- **Settlement Negotiation**: Nodes advertise supported chains, handshake finds common ground

**Pattern**: Address-based routing with cryptographic settlement on blockchain.

### Cross-Language Integration Patterns (TypeScript ↔ Go)

**HTTP/REST APIs:**
Most common cross-language integration:
- **Go Service**: Expose HTTP REST API (e.g., Beads could expose API on port 8080)
- **TypeScript Client**: Call API using `fetch` or HTTP client
- **Data Format**: JSON request/response bodies

**Advantages**: Language-agnostic, widely supported, simple. **Disadvantages**: HTTP overhead, synchronous request/response.

**gRPC (Type-Safe RPC):**
Modern alternative for cross-language services:
- **Protocol Buffers**: Define service contract (`.proto` files)
- **Code Generation**: Generate TypeScript and Go clients/servers
- **Transport**: HTTP/2 with binary payloads

**Advantages**: Type safety, high performance, bidirectional streaming. **Disadvantages**: More complex setup, binary protocol (less human-debuggable).

**Message Queue Intermediary:**
Use message broker for async integration:
- **Go Service**: Publish messages to queue (NATS, RabbitMQ, Kafka)
- **TypeScript Service**: Subscribe to queue, process messages
- **Data Format**: JSON or Protocol Buffer payloads

**Advantages**: Decoupled, async, scalable. **Disadvantages**: Additional infrastructure (message broker).

**Embedded via FFI (Foreign Function Interface):**
Compile Go as C library, call from Node.js:
- **Go**: Use `//export` to expose functions, build with `go build -buildmode=c-shared`
- **TypeScript**: Use `node-ffi` or `koffi` to call C functions

**Advantages**: No network overhead, direct memory sharing. **Disadvantages**: Complex, platform-specific, fragile.

**Recommended for Beads/Crosstown Integration:**
1. **Phase 1**: HTTP REST API - Beads exposes `/api/issues`, `/api/messages`, etc. Crosstown calls via HTTP
2. **Phase 2**: gRPC - Define service contract, generate clients, migrate to gRPC for performance
3. **Future**: Consider message queue if async work distribution needed

_Sources: [TypeScript-Go Migration](https://www.infoworld.com/article/4100582/microsoft-steers-native-port-of-typescript-to-early-2026-release.html), [Why Go for TypeScript](https://cekrem.github.io/posts/typescript-goes-go/), [TypeScript-Go Impact](https://www.pixelstech.net/article/1747365073-the-significant-impact-of-porting-typescript-to-go)_

### Integration Pattern Summary for Wasteland Architecture

**Recommended Integration Approach:**

| Integration Point | Current (Gastown) | Proposed (Wasteland) | Pattern |
|-------------------|-------------------|----------------------|---------|
| **Local Agent Communication** | Beads mail (sub-ms) | Keep existing | Point-to-point via shared DB |
| **Cross-Town Communication** | None (single machine) | Nostr events | Publish-subscribe via relays |
| **Identity** | Agent names | Nostr keypairs + ILP addresses | Cryptographic identity mapping |
| **Work Dispatch** | Direct assignment | NIP-90 DVM + ILP | Economic marketplace |
| **Data Sync** | Git push/pull (JSONL) | Nostr relay + Git fallback | Hybrid event stream + git |
| **Payments** | None | ILP PREPARE/FULFILL | Atomic micropayments |
| **Language Bridge** | N/A (all Go) | HTTP REST → gRPC | Cross-language API |
| **Security** | Implicit trust (local) | Nostr signatures + ILP gating | Cryptographic + economic |

**Key Integration Challenges:**
1. **Latency Gap**: Local (sub-ms) vs network (ms+) requires hybrid approach
2. **Protocol Translation**: Gastown mail → Nostr events needs message type mapping
3. **Economic Layer**: Adding payments changes agent coordination incentives
4. **Trust Model**: Local trust → social graph trust requires reputation system
5. **Language Boundary**: Go ↔ TypeScript integration adds complexity

**Key Integration Opportunities:**
1. **Standardization**: Nostr NIPs provide ecosystem, tooling, interoperability
2. **Scalability**: Network-native agents transcend single-machine limits
3. **Federation**: Cross-town collaboration enables distributed work
4. **Economic Coordination**: ILP enables resource allocation, reputation, paid computation
5. **Extensibility**: NIP process allows domain-specific extensions without forking protocol

<!-- Content will be appended sequentially through research workflow steps -->
