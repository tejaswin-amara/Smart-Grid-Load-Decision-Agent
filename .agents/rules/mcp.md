# 🛠️ MCP GOVERNANCE (v13.0.0-PRODUCTION HARDENED)

## ⚡ CORE SERVICE MAP
- **Browsermcp**: Verified E2E infrastructure testing.
- **Filesystem**: Authoritative monorepo mutation engine.
- **Rube-mcp**: Resilience-aware bridge for CloudRun/Exa.

## ⚖️ ARCHITECT STABILIZATION LAW
1.  **Exponential Backoff**: On MCP connection failure, the pilot MUST use exponential backoff for retries to prevent service saturation.
2.  **State Persistence**: System state must be cached in `learnings.md` before attempting risky MCP-driven mutations.
3.  **Context Hygiene**: Reset browser contexts between discrete tests to ensure zero-leakage across audit cycles.

## 🛡️ SENTINEL COMPLIANCE
- MCP servers are the primary sensors for the Chaos Pilot.
- "Heartbeat Drills" verify that MCP servers correctly report "Down" status for unreachable sub-services.
