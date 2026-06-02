# 🔐 AUTHENTICATION GOVERNANCE (v13.0.0-PRODUCTION HARDENED)

## ⚡ CORE STACK
- **Provider**: Better-Auth (Enterprise Layer)
- **Strategy**: Cookie-based Session Validation
- **Identity**: Google OAuth (Primary)

## ⚖️ ACCESS CONTROL LAW
1.  **RBAC**: Role-Based Access Control is enforced via the `Role` enum in the `User` schema.
2.  **Server Authority**: NEVER trust client-side role states. Always validate sessions via `auth.api.getSession` in API routes and Server Components.
3.  **Type Safety**: All session objects MUST be extended via module augmentation in `apps/web/src/types/auth.d.ts`.
4.  **Security**: CSRF protection is mandatory. The `BETTER_AUTH_SECRET` must be rotated annually.

## 🛡️ SENTINEL COMPLIANCE
- `sovereign-check.ps1` verifies the presence of Better-Auth module augmentation.
- Unauthorized API access must trigger a `401` response with structured error metadata.
