# 🧪 TESTING GOVERNANCE (v13.0.0-PRODUCTION HARDENED)

## ⚡ MANDATE
Every code change MUST have corresponding test coverage using the standardized testing framework guidelines. 
Zero untested paths in authentication, payment, or data mutation flows.

## ⚖️ THE ENTERPRISE PYRAMID
- **Unit**: Vitest for all Procedures (packages/api/src/routers/*.test.ts).
- **Integration**: React Testing Library for flows (apps/web/src/__tests__/auth.test.ts).
- **E2E**: Playwright for Critical User Journeys (playwright/tests/).
- **Audit**: D:/Skills/sovereign-check.ps1 verifies test execution status.

---
✅ Hardened v13.0.0-PRODUCTION Audit Active.
