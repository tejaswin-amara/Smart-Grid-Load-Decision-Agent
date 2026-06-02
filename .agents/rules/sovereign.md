---
name: sovereign
description: Sovereign Master Controller Execution
---
# Sovereign Command (v13.0.0-PRODUCTION — ENTERPRISE)

## Trigger Condition
**Triggered by:** /sovereign

> **ONE COMMAND. EVERYTHING FIRES.**
> This is the unified trigger for ALL workflows, ALL rules, ALL D:/Skills, and the Self-Evolution Engine.

---

## PHASE 1: INFRASTRUCTURE SYNC
// turbo
Execute the Sovereign Master Controller to sync the global library, harvest skills, and run drift analysis:
```
pwsh -ExecutionPolicy Bypass -File "D:/Skills/sovereign.ps1" -ProjectPath "$CWD"
```

---

## PHASE 1.5: SYSTEM & MCP VALIDATION
// turbo
Execute the local enterprise audit script to verify MCP servers, namespaces, and structural integrity:
```
pwsh -ExecutionPolicy Bypass -File "D:/Skills/sovereign-check.ps1" -ProjectPath "$CWD"
```

---

## PHASE 2: INGEST ALL LOCAL GOVERNANCE

After the PowerShell engine completes, the agent MUST read and internalize every governance file in the project. These are **not optional** — every file listed below becomes Active Law for the entire session.

### Rules (read ALL files in `.agents/rules/`)
1. Read `./.agents/rules/rules.md` — The Sovereign DNA and SPARC development rules.
2. Read `./.agents/rules/local-skills.md` — Skills Library integration and priority mandate.
3. Read any other `*.md` files that exist in `.agents/rules/` — they are all law.

### Workflows (read ALL files in `.agents/workflows/`)
1. Read `./.agents/workflows/auto-execute.md` — Ghost Protocol: absolute execution authority.
2. Read `./.agents/workflows/dna.md` — Sovereign DNA: identity and executive directives.
3. Read `./.agents/workflows/ghost-pilot.md` — Unified synthesis of all directives.
4. Read `./.agents/workflows/sentinel-ops.md` — Security and immutability operations.
5. Read any other `*.md` files that exist in `.agents/workflows/` — they are all law.

### Dynamic Discovery
If new `.md` files are added to `.agents/rules/` or `.agents/workflows/` after this workflow was written, the agent MUST still discover and read them. The list above is not exhaustive — it is a minimum. The agent must glob-scan both directories.

---

## PHASE 3: INGEST D:/Skills LIBRARY

1. Read `D:/Skills/INDEX.md` — The master index of all 103 certified skill repositories.
2. Read `.agents/knowledge/harvested_skills.md` — The harvester output showing which skills matched this project.
3. For every matched skill that has a `rules.md` or `CLAUDE.md` in its directory, read that file and adopt its patterns as reference architecture.

---

## PHASE 3.5: GSTACK INTEGRATION

If `gstack` was harvested in Phase 3, the agent MUST execute the `@[/gstack]` preamble to initialize the headless browser environment, check for updates, and verify project metadata.

---

## PHASE 4: SELF-EVOLUTION

1. Read `.agents/knowledge/evolution_report.md` — The drift analysis from the evolution engine.
2. If the report contains `REFINE` recommendations, apply them immediately:
   - If rules are missing domain-specific constraints, add them to `rules.md`.
   - If skills are unlinked, add their references to `harvested_skills.md`.
3. Read `.agents/knowledge/learnings.md` — Previous session intelligence.
4. Record any new learnings from this session before it ends.

---

## PHASE 5: DECLARATION

After completing all phases, confirm:
```
✅ SOVEREIGN v13.0.0-PRODUCTION ONLINE
- Rules ingested: [count]
- Workflows activated: [count]
- Skills harvested: [count]
- Evolution status: [aligned | drift-detected]
- All directives are ACTIVE LAW for this session.
```

---

## ⚠️ PERSISTENCE MANDATE
Once `/sovereign` has been executed, ALL ingested rules, workflows, and skills remain Active Law for the **entire duration** of this chat session. They do not expire. They are not optional. The agent must not selectively ignore any directive.
