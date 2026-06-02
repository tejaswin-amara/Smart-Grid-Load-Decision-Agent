# 🔱 SECRETS GOVERNANCE AND SENSITIVE DATA AXIOM (v13.0.0-PRODUCTION)

## SECTION 1: STORAGE RESTRICTIONS
1. Under no circumstances may any secret, API key, token, private key, or password be committed to version control.
2. All credentials MUST be loaded strictly via local environment files (`.env` or `.env.local`) or authenticated secret managers (e.g. Doppler, AWS Secrets Manager).

## SECTION 2: LEAK PREVENTION
1. Before any command containing `git push` or `git commit` is proposed, a pre-commit check must verify that no sensitive strings (regex checked for high-entropy keys like `sk-`, `ai-`, `pg-`) exist in the staged code.
2. Standard logging outputs and runtime traces must explicitly redact credentials. Entire print statements of raw `process.env` blocks are strictly forbidden.

## SECTION 3: COMPROMISE RESPONSE
1. If a key leak is detected, the agent must immediately issue a critical warning, append the key pattern to the local ignore file, and notify the developer to trigger key revocation protocols.
