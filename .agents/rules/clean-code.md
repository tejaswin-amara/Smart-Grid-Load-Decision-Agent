# ✨ CLEAN CODE GOVERNANCE (v13.0.0-PRODUCTION HARDENED)

## ⚡ CORE AXIOMS
- **Source**: `D:/Skills/clean-code-js`
- **Identity**: `@app/clean-code-hardened`
- **Footprint**: Part of the 103 certified skills.

## ⚖️ CLEAN CODE LAW
1.  **SOLID Principle**:
    - **S**: Single Responsibility. One class/function should do one thing.
    - **O**: Open/Closed. Open for extension, closed for modification.
    - **L**: Liskov Substitution. Subclasses should be replaceable by their base classes.
    - **I**: Interface Segregation. No client should be forced to depend on methods it does not use.
    - **D**: Dependency Inversion. Depend on abstractions, not concretions.
2.  **DRY (Don't Repeat Yourself)**: If logic appears in 2 or more files, it MUST be extracted to a shared utility in `packages/utils` or `packages/db`.
3.  **Naming Excellence**: Use searchable, intention-revealing names. Use `Boolean` prefixes like `is`, `has`, `should`.
4.  **Small Functions**: Any function exceeding 30 lines is a candidate for refactoring.

## 🛡️ SENTINEL COMPLIANCE
- The Sentinel Pilot proactively searches for "code smells" (duplicated blocks, long functions).
- Automated refactoring proposals are generated in `learnings.md` during the `sentinel-ops.md` loop.
