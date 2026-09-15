<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Detroit Root Network product direction

- Organize the product around **Customer Find**, **Farmer Sell**, and **Farmer Grow**. Grow and Sell may coexist for the same farm; they are capabilities, not authorization roles.
- Monetization is permitted only within Farmer Grow, subject to explicit approval of specific paid features. Keep Customer Find and Farmer Sell free of paywalls and monetization. Do not add billing merely because Grow is eligible.
- Follow `docs/PRODUCT-PRINCIPLES.md` for mission, privacy, and product boundaries.

## Human developer handoff

- Keep code readable and consistently annotated as it changes. Document the purpose and boundaries of non-obvious modules, public interfaces, security-sensitive logic, business rules, and deliberate tradeoffs. Explain why; do not narrate obvious syntax.
- Keep comments accurate when behavior changes. Prefer clear names and small functions over excessive comments. Update developer documentation for changes to configuration, data ownership, authentication, RLS, migrations, or deployment.
- Identify proposed behavior separately from implemented behavior. Record relevant checks and known limitations; do not claim unperformed verification.

## Security and integrity

- Never knowingly introduce malicious code, backdoors, hidden accounts, undocumented access paths, credential exfiltration, or authentication/authorization bypasses.
- Review changed code and introduced dependencies for unexpected network activity, secret handling, excessive privileges, and hidden side effects. This is not a claim that the entire repository has been audited.
- Investigate suspected malicious behavior; report evidence and remove confirmed threats within authorized scope. Preserve non-sensitive evidence needed to explain the fix. If remediation requires external credential rotation or destructive actions beyond authorization, explain the required action without exposing secrets.
- Preserve ordinary Supabase identity, explicit roles and memberships, RLS, and T2 read-only protection. Keep private keys and access codes server-only. Never weaken these controls for previews, monetization, or convenience.
- Temporary beta code login must remain documented and removable, with its kill switch; remove it before a larger demo as already required.
