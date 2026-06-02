# Sovereign Learning Buffer (v13.0.0-PRODUCTION HARDENED)

This file is a persistent ledger of architectural wins, failures, and "Aha!" moments. The Sovereign Evolution Engine (v13.0.0-PRODUCTION) reads this file during every execution to refine project rules and workflows.

## 🗒️ Recent Learnings

| Date | Category | Learning | Action Taken |
|---|---|---|---|
| 2026-06-02 | Resiliency | **STLITE WEB PYTORCH COMPATIBILITY**: PyTorch and Stable-Baselines3 are incompatible with browser WebAssembly stlite sandboxes. Designed a resilient imports bridge with a closed-form heuristic surrogate fallback, ensuring 100% dashboard uptime in both local PyTorch and static browser stlite deployments. | Implemented dynamic imports and fallbacks in `app.py`. |
| 2026-04-25 | Hardening | **v13.0.0-PRODUCTION TERMINAL HARDENING**: Resolved SHA parity mismatch by baking `VERCEL_GIT_COMMIT_SHA` into `next.config.mjs` and updating diagnostics route to prioritize baked-in variables. | Patched `next.config.mjs` and `route.ts`. |
| 2026-04-25 | Middleware | **LOCALE-PREFIXED API BYPASS**: Standardized middleware logic to detect `/api` regardless of locale prefix (`/en/api`, etc.) ensuring health/diagnostic stability. | Refactored `middleware.ts`. |
| 2026-06-02 | Deployment | **DUAL-DELIVERY GITHUB PAGES STRATEGY**: Designed a zero-dependency client-side architecture (`index.html` + `script.js`) executing microgrid gymnasium physics and continuous SAC neural-network policies in ES6 JavaScript. Enables high-fidelity interactive simulation on GitHub Pages without server-side resources, complementing the local Streamlit dashboard. | Developed `index.html`, `styles.css`, and `script.js`. |
| 2026-04-18 | Maintenance | **v13.0.0-PRODUCTION STABILIZATION**: Completed 🔱 SOVEREIGN COMMAND (v13.0.0-PRODUCTION) Unified Initializaton suite. Confirmed zero drift across 103-skill manifest. | Executed `sovereign.ps1`, `doctor.ps1`, and `sovereign-check.ps1`. |
| 2026-04-17 | Infra | **v13.0.0-PRODUCTION DIRECT-PATH STABILIZATION**: Purged all `npx` calls from `mcp_config.json`. Enforced absolute, quoted `node.exe` paths. | Refactored `mcp-guardian.ps1` and patched config. |
| 2026-04-17 | Governance | **v13.0.0-PRODUCTION EVOLUTION**: Integrated 14 architectural signals into `rules.md`. Established A1-A5 Invariants. | Updated Base Law to v13.0.0-PRODUCTION. |
| 2026-04-17 | Infra | **DOCKER STANDALONE FIX**: Discovered that Next.js 15 requires `DOCKER_BUILD=true` env var and correct Turborepo filter (`@app/web`) to generate `standalone` output in Docker. | Updated Dockerfile and env vars. |
| 2026-04-17 | Auth | **BETTER AUTH LOCALIZATION**: Standardized on `/en/` prefixed callbacks to prevent middleware loops in Next.js 15. | Updated `auth.ts` and `auth-client.ts`. |
| 2026-04-14 | Database | Use `DIRECT_DATABASE_URL` instead of `DATABASE_URL` for large seeding operations to bypass PgBouncer limits. | Refactored `seed.ts`. |
| 2026-04-14 | System | Confirmed that `pnpm type-check` is the supreme truth source over ephemeral agent reviews. | Codified A4 Truth Seniority. |

## 🚀 Optimization Hypotheses
- *Hypothesis*: Adding domain-specific rules locally reduces agent confusion in complex monorepos.
- *Validated*: Adding Next.js/Tailwind/Zod rules to rules.md eliminated all drift detection issues (0 out of 3 checks failed).
- *Hypothesis*: Running MCP servers natively (npx) is more reliable than Docker containers with `mcp-proxy` wrappers for development.
- *Validated*: Docker SSE containers for Exa/CloudRun/Firebase all crashed with E404; native npx runs are immediate and don't require Docker overhead.
- *Hypothesis*: Explicitly typing `useMutation` generic parameters in TanStack Query prevents `void` type inference regressions in Turborepo builds for Next.js 15.
- *Validated*: The build failed with Next.js compiling the Frappe `create` mutation as `void`, overriding it with explicit `<any, Error, { doctype: string, data: any }>` resolved the build blockers.

## ⚠️ Zero-Any Policy Intentional Exception Declaration
- **TanStack useMutation `any` Exception**: Raw `any` types are explicitly permitted when interfacing with TanStack Query generic parameters (e.g. `<any, Error, ...>`) due to third-party type library constraints where forcing stricter types introduces type incompatibility compiler regressions in compiled Turborepo outputs.


