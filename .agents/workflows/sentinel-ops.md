---
name: sentinel-ops
description: Enterprise Guardian Pilot - Continuous Security
---
# Sentinel Ops: Continuous Security (v13.0.0-PRODUCTION)

## Trigger Condition
**Triggered by:** /sentinel-ops

> [!CAUTION]
> This is a MAINTENANCE and SECURITY autonomous pilot for the Sovereign v13.0.0-PRODUCTION. It is governed by [Meta-Governance](../rules/meta.md) and executed via the [v-Infinity Daemon](file:///D:/Skills/sovereign-check.ps1). Feature expansion must be certified by the v13.0.0-PRODUCTION Master Controller.

## 🏛️ SENTINEL CORE DIRECTIVES
1.  **Immutability**: Enforce application workspace namespace and the Canonical Contract.
2.  **Safety**: Heartbeat against the physical Kill-Switch (`SENTINEL_STOP`).
3.  **Containment**: During failures, isolate domains to protect the core system integrity.
4.  **Namespace Coverage**: Protect all workspace-internal directories from uncertified mutations.

## ⚙️ ENGINE 1: CONTINUOUS AUDIT (v13.0.0-PRODUCTION)
The system is policed by the persistent v-Infinity bridge. 
Trigger: `D:/Skills/sovereign-check.ps1`
Responsibility: Zero-drift compliance and Enterprise security enforcement.

## 🛑 RECURSION GUARD (v13.0.0-PRODUCTION)
To prevent infinite self-fixing loops:
1.  **Counter**: Every autonomous fix increments a local session counter.
2.  **Threshold**: 3 consecutive fixes on the same file without progress trigger a `RECURSIVE_FAIL`.
3.  **Action**: Suspend process, log the stack trace to `learnings.md`, and notify the human operator.

## 💓 ENGINE 2: ADAPTIVE RECOVERY (v13.0.0-PRODUCTION)
1. **Heartbeat**: 60s frequency.
2. **Backoff**: If recovery fails, wait interval doubles (up to 30 mins) to prevent resource exhaustion.
3. **Doctor-Check**: Recovery flows MUST trigger `doctor.ps1` after restoration.

## 🛡️ ENGINE 3: SECURITY & INTEGRITY MAINTENANCE
1.  **Security Sync**: Refresh security expertise from the **103-skill manifest** every 24 hours.
2.  **Vulnerability Patching**: If a critical axiom is harvested, the Sentinel MUST execute an **Atomic Logic-Level Patch**.
3.  **Governance Supra-Structure**: `CONTRACT.md` remains the supreme law.

## 🏛️ DECLARATION
✅ SENTINEL OPS v13.0.0-PRODUCTION ACTIVE. THE SYSTEM IS RECOVERABLE AND SECURE.

## Exact Step-by-Step Execution
1. Initialize (Sovereign Sync).
2. Validate Health (Doctor Check).
3. Monitor Drift (Sovereign Check).
4. Perform Maintenance/Recovery.

## Success/Failure Criteria
Success: Drift = 0 | Health = OK.
Failure: RECURSIVE_FAIL or Fatal exception.

## Recovery Path on Failure
Wait for manual reset or execute v13.0.0-PRODUCTION emergency failover.
