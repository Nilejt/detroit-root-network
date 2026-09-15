# Detroit Root Network — private beta deployment

> **REQUIRED BEFORE A LARGER DEMO: REMOVE CODE LOGIN.** Disable it, redeploy, remove the beta endpoint/form and private code variables, and revoke beta sessions. Email magic links remain the supported authentication method. Do not treat shared access codes as permanent authentication.

This package was verified against the supplied detroitrootnetwork.zip. Its source files match the original workspace baseline; no additional application files or database migrations were found in the supplied ZIP. It excludes all environment files, build output, dependencies, and Git history. The existing Supabase database is required: original migrations 001–002 were not present. Do not apply this package to an empty database without recovering that original schema and its RLS policies.

## Deploy to Vercel

1. Extract the ZIP and import the project into Vercel as Next.js. Use `npm ci`, `npm run build`, and the default Next.js output. The lockfile is included.
2. Keep `ENABLE_BETA_CODE_LOGIN=false` initially. In Supabase Authentication, ensure the existing identities `nilejt@gmail.com` and `qhamilton@gmail.com` exist and have confirmed email addresses. Copy their actual Auth user UUIDs; do not create duplicate identities or set an Auth service-role claim on either account.
3. Back up the database. If not already applied, run migrations 003 then 004 against the existing schema, then run `supabase/migrations/005_beta_operator_access.sql` as the database administrator. Migration 005 provisions Owner and Director Q roles, Q's Stall membership, cross-T1 RLS permissions, and T2 protection. It fails if confirmed identities or Q's T1 stall are missing. Existing farmer/public policies are retained. These migrations have not been executed against your live database in this session.
4. Add the variables below in Vercel project settings. Mark secrets Sensitive, scope to the intended private beta deployment environment only, and do not expose them to untrusted previews. Never commit secrets, put them in a ZIP, save them in `.env.local`, or use a `NEXT_PUBLIC_*` name for any code or service-role key.
5. Configure Supabase Auth Site URL to your deployment origin and add the exact `https://YOUR-DOMAIN/auth/callback` to the redirect allowlist. The farmer email flow uses PKCE and must open in the browser where the link was requested. Keep the standard Supabase confirmation-link email template. Configure email delivery for your farmer audience.
6. Enable a Vercel Firewall rate-limit rule for POST `/api/auth/beta` (for example 5 attempts per minute per source IP) before sharing the beta. This route requires 256-bit secrets, but deliberately does not use an ineffective per-process rate limiter on serverless instances. Do not enable request-body capture for this route in monitoring tools.
7. Set `ENABLE_BETA_CODE_LOGIN=true` and redeploy after the checks below. Environment changes require a new deployment. Use one canonical domain matching `APP_ORIGIN`; code login on other aliases is rejected.

| Variable | Value / purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Existing Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Existing public publishable key; RLS must stay enabled |
| `ENABLE_BETA_CODE_LOGIN` | Exactly `true` to enable; all other/missing values disable |
| `APP_ORIGIN` | Canonical HTTPS origin, without trailing slash or path |
| `SUPABASE_SERVICE_ROLE_KEY` | Private server-only service-role key from the same Supabase project |
| `BETA_OWNER_USER_ID` | Existing confirmed Auth UUID for nilejt@gmail.com |
| `BETA_DIRECTOR_Q_USER_ID` | Existing confirmed Auth UUID for qhamilton@gmail.com |
| `BETA_OWNER_CODE` | Separate random 64-character lowercase hex secret |
| `BETA_DIRECTOR_Q_CODE` | Different random 64-character lowercase hex secret |

## Create two separate random codes

On a trusted computer with Node.js installed, run this command once for Owner, then run it again for Director Q:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Each invocation produces a new 256-bit code. Paste each directly into its corresponding private Vercel variable. The command itself contains no secret. Do not save its output in source files, terminal transcripts, GitHub, tickets, chat, or this README. Clear the clipboard and terminal output afterward. Share each code privately with only its intended holder. No live codes are generated or shipped in this package. Repeated characters in automated tests are mock fixtures, not usable deployment codes.

## Authentication and security boundaries

The endpoint validates the selected account and code on the server using constant-time hash comparison, requires an exact same-origin JSON request, caps the body, and fails closed on missing configuration. It checks the existing confirmed Auth identity and database profile role before generating and immediately exchanging a Supabase magic-link token. It never changes roles during login or sends an email for beta login. Identity mappings are fixed server-side.

The private service key is used only for identity/profile reads and Auth link generation, never application data writes. The returned session is the ordinary authenticated Supabase user session; browser queries still use the public client and existing RLS. Supabase SSR manages session cookies shared with the existing browser client (these are intentionally browser-readable for this application's direct Supabase access). Codes and generated link tokens are never returned in JSON, stored in browser storage, or logged by the application. Keep the existing application's XSS protections intact.

T2 triggers reject inserts, updates, deletes, retiering T2 to T1, and moving children from or into T2 for app users, including Owner and Q. Database administrators retain maintenance access. Migration 005 also prevents client-side profile role/identity changes. Review original policies for additional application tables because their defining migrations were absent.

References: [Supabase generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink), [Supabase verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp).

## Verification before sharing

Local automated checks: `node --test tests/beta-login.test.cjs`, `npm run lint`, `npm run build`. The route tests mock Supabase, covering disabled login, bad origins/input, wrong or cross-account codes, missing/duplicate secrets, identity/role mismatches, successful Owner/Q cookie sessions, and failed verification without cookies. They do not establish live database behavior.

Run these live acceptance checks on the private deployment with ordinary user sessions, not the service key:

- Owner code signs in as nilejt@gmail.com / owner; Q code signs in as qhamilton@gmail.com / director_q. Wrong codes and cross-account codes fail. Q has Q's Stall membership and can edit a different T1 stall.
- A farmer email link signs in, survives reload, and permits only the farmer's intended membership access. A farmer cannot promote their profile role or edit unrelated T1 data.
- For Owner, Q, and farmer: direct Supabase API attempts to insert/update/delete T2 farms and each child table must fail. Include changing a T2 farm to T1 and moving a T2 child to a T1 farm. Verify normal T1 edits succeed for authorized accounts. Check RLS remains enabled and T2 discovery reads still work.
- Sign out and switch identities; confirm the interface and editable stall list match the new account. Test expired/reused email links.
- Set the kill switch to false and redeploy: the beta form disappears and POST returns 404, while farmer magic links continue working. Verify the firewall rule rejects repeated attempts.

## Mandatory removal before a larger demo

1. Set `ENABLE_BETA_CODE_LOGIN=false` and redeploy immediately to stop new beta logins. Rotation and this switch do **not** revoke previously issued Supabase sessions.
2. Revoke all sessions for both beta identities through Supabase Auth administration, including refresh tokens. Already issued access JWTs remain usable until expiration; wait out the configured JWT lifetime before treating access as revoked.
3. Delete `src/app/api/auth/beta/route.ts`, `src/app/beta-login.tsx`, the `BetaLogin` import/render in `src/app/page.tsx`, and the beta endpoint tests. Retain the farmer email callback and database protections.
4. Delete both code variables, beta UUID variables, the kill switch, and the service-role variable if nothing else uses it. Remove or protect old Vercel deployments that still have beta code/environment snapshots; disabling only the newest deployment does not disable old URLs.
5. Rebuild and redeploy; verify `/api/auth/beta` is gone and both operators can use email links. Keep their database roles and Q's membership. Complete live RLS checks before the larger demo.
