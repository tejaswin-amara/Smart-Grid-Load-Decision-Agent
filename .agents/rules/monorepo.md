# 📦 MONOREPO GOVERNANCE (v13.0.0-PRODUCTION HARDENED)

## ⚡ CORE STACK
- **Orchestration**: Turborepo + pnpm (Enterprise Tier)
- **Architecture**: Next-Enterprise (Hardened Layers)
- **Namespace**: `@app/`

## ⚖️ ENTERPRISE WORKSPACE LAW
1.  **Strict Layering**: Domain logic must reside in `packages/` or namespaced directories, completely decoupled from the Next.js `app/` router where possible.
2.  **Zero-Drift Sync**: Infrastructure MUST be synchronized via the global `sovereign.ps1` controller at every session start.
3.  **Turbo Execution**: Prohibit absolute file paths in application source code; use relative or workspace-aliased imports only. **Exception**: `D:/Skills/` governance paths are permitted in agent configuration, `.agents/` rules, and PowerShell bootstrap scripts since the Sovereign infrastructure requires fixed-location skill references.
4.  **Scaling**: Any package exceeding 500 lines of business logic MUST be audited for potential decomposition into sub-packages.

## 🛡️ SENTINEL COMPLIANCE
- `sovereign-check.ps1` verifies workspace export path integrity.
- Automated PRs (via the Sentinel) handle dependency version synchronization.
