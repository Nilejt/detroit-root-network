# Recruiter page setup

The new page will be at https://detroit-root-network.vercel.app/design-journey after deployment. It presents the technical case study and public discovery link. It is not a farmer/Owner/Director account and cannot edit farm records. The five-digit code is a convenience gate for shareable portfolio information; do not put confidential content behind it.

## 1 Apply migration 006

Migration 005 is already applied; do not rerun the old seed migrations. Copy the new SQL from PowerShell:

```powershell
Get-Content -LiteralPath "C:\Users\Nile T\Desktop\AgentProjects\detroitrootnetwork\supabase\migrations\006_recruiter_rate_limit.sql" -Raw | Set-Clipboard
```

Paste into Supabase → SQL Editor → New query and run. It creates an isolated private attempt-counter table and one service-role-only function. It does not change farms, Auth users, memberships, or application role policies. The application fails closed if this migration is missing.

The limiter allows five attempts per source IP per fixed 15-minute window and 50 attempts across the entire presentation gate in the same window. It counts successful and unsuccessful submissions. All app instances share the counters. Counters contain HMAC-derived IP buckets, not raw IPs or codes; old windows are cleaned on subsequent attempts. On Vercel, the server trusts the platform-overwritten x-forwarded-for header. Other hosting environments share one bucket unless their proxy model is explicitly implemented.

## 2 Add private Vercel Production variables

Keep APP_ORIGIN, SUPABASE_SERVICE_ROLE_KEY, all existing beta codes, and the existing beta switch unchanged. Add:

| Variable | Value |
| --- | --- |
| ENABLE_RECRUITER_PAGE | false until the migration and deployment are ready |
| RECRUITER_ACCESS_CODE | A five-digit code; store as Sensitive |
| RECRUITER_SESSION_SECRET | Independent 64-character random secret; store as Sensitive |

Generate the five-digit code on your computer:

```powershell
node -e "console.log(require('node:crypto').randomInt(0,100000).toString().padStart(5,'0'))"
```

Copy the output into RECRUITER_ACCESS_CODE exactly, including leading zeroes. Share only this five-digit code with recruiters.

Generate the session secret separately:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy the second output into RECRUITER_SESSION_SECRET. Do not share this secret with recruiters or put either value in Git, environment files, screenshots, or chat. The session secret signs a four-hour HttpOnly cookie; the cookie has no Supabase credentials. Changing either value and redeploying invalidates the presentation sessions on that deployment. Disabling the recruiter switch also closes access. Older deployments must be retired or protected separately.

No real code or session secret was created for you. Fixed values in automated tests are local test fixtures only.

## 3 Validate and push

Run from the existing project folder, stopping on errors:

```powershell
npm.cmd run lint
node --test tests/beta-login.test.cjs tests/recruiter-access.test.cjs
npm.cmd run build
```

Stage only the recruiter changes and documentation:

```powershell
git add -- src/app/recruiter src/app/api/auth/recruiter src/lib/recruiter-access.ts src/content/recruiter.json supabase/migrations/006_recruiter_rate_limit.sql tests/recruiter-access.test.cjs docs RECRUITER-SETUP.md
git diff --cached --name-only
git commit -m "Add recruiter project brief and separate presentation access"
git push origin main
```

The Word file and Markdown brief contain shareable project information, not private credentials. If you prefer to keep those documents out of the repository, omit docs from the staging command. The page does not serve those files as public downloads.

## 4 Enable and test

After Vercel reports Ready, set ENABLE_RECRUITER_PAGE=true in Production and redeploy. Keep the existing beta firewall rule. The new recruiter endpoint uses its own database-backed limiter and does not depend on adding a second paid firewall rule.

Visit /recruiter and enter the five-digit code. Check the headings, team roles, architecture, expandable workflows, evidence, and next steps. Test a wrong code, logout, and a fresh private browser without a session. After five submissions from one IP in the window, another submission must be denied; wait for the next 15-minute window before continuing. Test this away from your presentation time, since people on the same network share an IP limit.

The page was tested locally on desktop and mobile with test-only signed cookies. Fifteen automated tests passed (eight existing beta tests plus seven recruiter tests), along with lint and build. Live database-backed limiter behavior still requires the migration and deployment check. Existing farmer email sign-in also still needs its previously pending post-configuration retest.

## Documents and editorial review

The technical Word brief is in docs/Detroit-Root-Network-Technical-Project-Brief.docx. It uses the selected System Design template. Content, absence of unfilled template placeholders, and preservation of non-content template parts were checked. Word pagination could not be visually verified because this environment has no Word/LibreOffice renderer. Open it in Word and review page breaks before sharing.

Review the competition wording and both people's contributions before public distribution. The content explicitly identifies AI-assisted development, user-reported beta checks, planned farmer participation, and the remaining email/RLS validation work. It does not claim measured community impact or unperformed research.

Reminder: remove temporary Owner/Director Q code login before the larger demo, as documented in README.md. This separate portfolio gate does not replace that requirement.
# Design Journey URL update

The presentation is now called **Design Journey** at `/design-journey`. The old `/recruiter` URL redirects there. Navigation places Design Journey before Director Q. Existing `RECRUITER_*` variables, the enable switch, and the five-digit access code are unchanged. The internal authentication endpoint remains `/api/auth/recruiter`; its login/logout redirects and cookie path now target `/design-journey`. People with an old path-scoped session may need to enter the same code again.
