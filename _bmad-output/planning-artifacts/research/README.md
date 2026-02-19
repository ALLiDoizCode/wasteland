# Wasteland Research Documentation

This directory contains feasibility research for building **Wasteland** - a network-native agent orchestration system using Crosstown (Nostr ILP).

## Research Documents

### 1. Feasibility Analysis (Primary Document)
**File:** `feasibility-beads-mailing-on-nostr-ilp-2026-02-19.md`

**Status:** ✅ COMPLETE

**Summary:** Comprehensive analysis answering: "Can Crosstown (Nostr ILP) natively replace Beads + Mailing Protocol?"

**Answer:** ✅ **YES - HIGHLY FEASIBLE (75% native coverage)**

**Contents:**
- **Part 1:** Beads problem-solution mapping (7/7 problems)
- **Part 2:** Mailing Protocol problem-solution mapping (10/10 problems)
- **Part 3:** Required NIPs (NIP-3001 through NIP-3005)
- **Part 4:** Implementation roadmap (6 phases, 40-52 weeks)
- **Part 5:** Risk assessment (19 risks, mitigations)

**Key Finding:** NIP-3003 (ILP claim locks) is the breakthrough - native Nostr+ILP synergy that solves race conditions with economic commitment.

**Recommended Next Step:** Execute Phase 0 POC (2-4 weeks) to validate core assumptions.

---

### 2. Technical Research (Background)
**File:** `technical-beads-nostr-iop-integration-research-2026-02-19.md`

**Status:** Paused (superseded by feasibility analysis)

**Contents:**
- Technology stack analysis (Beads, Gastown, Crosstown, Nostr, ILP)
- Integration patterns analysis
- Background research that informed the feasibility analysis

**Use:** Reference document for understanding the technology landscape.

---

## Quick Reference

### Custom NIPs Required

| NIP | Title | Priority | What It Replaces |
|-----|-------|----------|------------------|
| **NIP-3001** | Task Management | HIGH | Beads core (tasks, dependencies, wisps) |
| **NIP-3002** | Agent Directory | HIGH | Mailing Protocol (addressing) |
| **NIP-3003** | Work Queue + ILP | HIGH | Both (claiming + economic layer) 🚀 |
| **NIP-3004** | Coordination Messages | MEDIUM | Mailing Protocol (message types) |
| **NIP-3005** | Workflow Templates | LOW | Beads (molecules) |

### Implementation Phases

```
Phase 0: POC (2-4 weeks) → Validate assumptions
Phase 1: Foundation (6-8 weeks) → NIP-3001, NIP-3002
Phase 2: Economic (8-10 weeks) → NIP-3003 with ILP
Phase 3: Coordination (10-12 weeks) → NIP-3004, agent swarm
Phase 4: Advanced (6-8 weeks) → NIP-3005, optimization
Phase 5: Production (8-10 weeks) → Federation, scaling
```

**Total Timeline:** 40-52 weeks (~12 months)

### Replacement Timeline

- **Mailing Protocol:** 100% replaced by Phase 3 (Week 32)
- **Beads:** 100% replaced by Phase 5 (Week 48)

**Insight:** You can run agents on Wasteland (Mailing replacement) before full Beads feature parity!

---

## Next Steps

1. **Review feasibility analysis** (`feasibility-beads-mailing-on-nostr-ilp-2026-02-19.md`)
2. **Decision:** Approve Phase 0 POC
3. **Setup:** Initialize wasteland project structure
4. **Execute:** 2-week POC to validate core mechanisms
5. **Evaluate:** GO/NO-GO decision based on POC results

---

## Project Context

**Vision:** Replace machine-based agent orchestration (Gastown) with network-native distributed agent swarms running on Crosstown (ILP-gated Nostr relay network).

**Core Question:** Can we solve the same problems that Beads and Mailing Protocol solve, but natively using Nostr ILP primitives?

**Answer:** Yes, with high confidence (75% native, 5 custom NIPs, 12-month timeline).

**Innovation:** Using ILP payments as atomic claim locks - a protocol-level solution that couldn't exist in Nostr or ILP alone.

---

**Last Updated:** 2026-02-19
**Research Conducted By:** Claude Sonnet 4.5 (Technical Research Agent)
**Project:** Wasteland - Network-Native Agent Orchestration
