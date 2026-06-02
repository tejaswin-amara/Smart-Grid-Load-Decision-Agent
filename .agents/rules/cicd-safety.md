# 🔱 CI/CD PIPELINE ANTI-HALLUCINATION AXIOM (v13.0.0-PRODUCTION)

## SECTION 1: EXECUTION AUTHORITY
1. Agents are strictly prohibited from modifying test files or configuration suites to bypass failures.
2. In the event of a test pipeline failure, the agent MUST resolve the underlying root cause in application logic. Disabling tests, adding dummy mocks, or modifying assertions without direct code correction is a Class-0 Governance Violation.

## SECTION 2: VERIFICATION PROTOCOLS
1. No release or branch merge command may be proposed until `pnpm type-check` (or equivalent target language strict check) completes synchronously with zero warnings.
2. If static type-checking fails, the deployment pipeline is blocked. Agents are prohibited from proposing build scripts with `--no-verify` or `--skip-tests` flags.

## SECTION 3: IMMUTABILITY OF DIAGNOSTICS
1. Diagnostic and logging configs must remain untampered. Agents must not alter linting rules (e.g. adding `eslint-disable` blocks) to mask validation errors.
