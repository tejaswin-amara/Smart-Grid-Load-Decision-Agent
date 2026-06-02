# 🗄️ DATABASE GOVERNANCE (v13.0.0-PRODUCTION HARDENED)

## ⚡ CORE STACK
- **ORM**: Drizzle ORM (Hardened Layer)
- **Engine**: PostgreSQL 16 (Enterprise Scale)
- **Migrations**: `drizzle-kit` (Atomic Sync)

## ⚖️ DATA INTEGRITY LAW
1.  **Naming Convention**: Use `snake_case` for database columns and `camelCase` for TypeScript schema definitions.
2.  **Traceability**: Every table MUST include `createdAt` and `updatedAt` timestamps.
3.  **JSONB Policy**: Heavy use of `jsonb` metadata fields is encouraged for external system reconciliation (e.g., Frappe, Razorpay).
4.  **Indexing**: All high-load columns (`id`, `slug`, `userId`, `status`) MUST have explicit indices defined in the schema.
5.  **Schema Locality**: All schemas MUST reside in `packages/db/src/schema/` and be exported in `index.ts`.

## 🛡️ SENTINEL COMPLIANCE
- The `sovereign-check.ps1` engine verifies schema export integrity.
- Any manual SQL mutation outside of Drizzle migrations is Strictly Forbidden.
