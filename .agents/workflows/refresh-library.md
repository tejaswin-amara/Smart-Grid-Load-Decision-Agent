---
name: refresh-library
description: Global Skill Library Synchronization
---
# Refresh Library: Global Asset Sync (v13.0.0-PRODUCTION)

## Trigger Condition
**Triggered by:** /refresh-library

// turbo-all

> [!IMPORTANT]
> This is a MAINTENANCE workflow for synchronizing the 94 Enterprise Skill Repositories.

## 🤖 ACTION LOGIC
1. **Index:** Use `filesystem` MCP to get a list of all subdirectories in `D:/Skills`.
2. **Update:** For every folder found, autonomously execute `git pull` via the terminal.
3. **Audit:** Verify the results against `D:/Skills/MANIFEST.json`.
4. **Report:** Provide a concise summary of which "Skills" were updated.
5. **Zero-Review:** Complete the entire process without waiting for user confirmation.

## 🏛️ DECLARATION
✅ LIBRARY SYNC v13.0.0-PRODUCTION ACTIVE.

## Exact Step-by-Step Execution
1.  **Phase 1: Discovery**
    ```powershell
    ls D:/Skills
    ```
2.  **Phase 2: Sync**
    Iterate through directories and run `git pull`.
3.  **Phase 3: Verify**
    Cross-reference with the **103-skill manifest**.

## Success/Failure Criteria
Success: All 94 skills are `up-to-date`.
Failure: Network error or Git conflict.

## Integration with other workflows
Integrates with the Sovereign Master Controller for library parity.
