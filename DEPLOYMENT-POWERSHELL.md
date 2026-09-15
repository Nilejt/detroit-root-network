# Update the existing Detroit Root Network deployment

These steps follow the PowerShell → GitHub → Vercel workflow from “Design Detroit Farm Hub.”
Repository: https://github.com/Nilejt/detroit-root-network
Branch: main
Previously deployed site: https://detroit-root-network.vercel.app

IMPORTANT: Remove beta code login before a larger demo. See README.md for the full removal procedure, session revocation, and live permission tests.

## 1. Open the existing project in PowerShell

```powershell
Set-Location "C:\Users\Nile T\Desktop\AgentProjects\detroitrootnetwork"
git branch --show-current
git remote -v
git status --short
```

The branch should be main and origin should be the repository above. The updated files are already in this folder from this Codex task, so no ZIP extraction is needed on this computer. If installing on another copy, first back up any local edits, download the deployment ZIP to Downloads, then run this from that project's root:

```powershell
Expand-Archive "$env:USERPROFILE\Downloads\detroit-root-network-beta-deployment.zip" -DestinationPath . -Force
```

Do not replace the project with the original source ZIP; use the beta deployment ZIP. Keep the existing .git folder. The update ZIP does not contain .env.local, node_modules, or .next.

## 2. Prepare Supabase before enabling login

Open your existing Supabase project. Under Authentication → Users, confirm both of these accounts exist and have confirmed email addresses:

- Owner: nilejt@gmail.com
- Director Q: qhamilton@gmail.com

If an account is missing or unconfirmed, complete its email magic-link sign-in first. Copy each user's UID/UUID from Authentication → Users for step 3.

Back up the database. Assuming migrations 003 and 004 were applied with the earlier updates, run ONLY migration 005 now. Do not rerun migration 003 casually: it contains seed updates that can overwrite stall details.

Copy the new SQL file to the clipboard:

```powershell
Get-Content ".\supabase\migrations\005_beta_operator_access.sql" -Raw | Set-Clipboard
```

In Supabase → SQL Editor, open a new query, paste, and Run. It must succeed before enabling beta login. If it reports missing accounts, Q's Stall, tables, or types, stop and resolve that prerequisite. The package does not include original migrations 001–002 and is intended for your existing database.

Under Supabase Authentication → URL Configuration:

- Site URL: https://detroit-root-network.vercel.app
- Add redirect URL: https://detroit-root-network.vercel.app/auth/callback

If you have changed the live domain, use that domain consistently here and for APP_ORIGIN below. Keep the standard confirmation-link email template.

## 3. Configure Vercel

Open the existing Vercel project connected to Nilejt/detroit-root-network. Confirm its production branch is main. Open Settings → Environment Variables. Scope these to Production for the existing live beta site, not all Preview deployments.

Keep the existing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.

Add these private server variables:

| Name | Value |
| --- | --- |
| ENABLE_BETA_CODE_LOGIN | false initially |
| APP_ORIGIN | https://detroit-root-network.vercel.app (no trailing slash) |
| SUPABASE_SERVICE_ROLE_KEY | The service_role key from this same Supabase project's API key settings; mark Sensitive |
| BETA_OWNER_USER_ID | Owner Auth user UUID copied in step 2 |
| BETA_DIRECTOR_Q_USER_ID | Q Auth user UUID copied in step 2 |
| BETA_OWNER_CODE | Separate random code generated below; mark Sensitive |
| BETA_DIRECTOR_Q_CODE | Different random code generated below; mark Sensitive |

Generate Owner's code in PowerShell:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy its 64-character output directly into BETA_OWNER_CODE. Run the command again and put the new output in BETA_DIRECTOR_Q_CODE. Do not reuse the first code. Share each privately with its intended holder; do not paste either into chat, source files, .env.local, GitHub, or a NEXT_PUBLIC variable. Clear the clipboard and terminal output afterward.

Configure a Vercel Firewall rate limit for POST /api/auth/beta before sharing beta access (for example five requests per minute per source IP). The application does not include a distributed request limiter. See README.md for security details.

## 4. Build and check locally

Run these commands one at a time. Stop if any fails; do not publish a failed build.

```powershell
npm.cmd ci
npm.cmd run lint
node --test tests/beta-login.test.cjs
npm.cmd run build
```

Use npm.cmd in PowerShell, as in the previous deployment instructions. Do not type “cmd install” or “cmd run build.”

## 5. Commit and push the update

Stage the update files explicitly so the ZIP and unrelated local files are excluded:

```powershell
git add -- README.md DEPLOYMENT-POWERSHELL.md src/app/page.tsx src/app/farmer-tools.tsx src/app/beta-login.tsx src/app/api/auth/beta/route.ts src/app/auth/callback/route.ts supabase/migrations/005_beta_operator_access.sql tests/beta-login.test.cjs
git diff --cached --name-only
git diff --cached --stat
```

Review the staged list. It should contain only the listed application, migration, test, and documentation files—no ZIP, .env files, .next, node_modules, or credentials. Then:

```powershell
git commit -m "Add temporary Owner and Director Q beta login"
```

Only after the commit succeeds:

```powershell
git push origin main
```

If push is rejected because GitHub has newer changes, stop and resolve the divergence; do not force-push. If the commit says nothing to commit, check git status and git log -1 --oneline to see whether it was already committed.

## 6. Finish the Vercel deployment

With the Git integration enabled, the push triggers a deployment. In Vercel → Deployments, wait for the new main commit to show Ready. Verify the beta form is hidden while the switch is false, and test a farmer email sign-in through the new callback.

Once the database migration, private variables, and firewall rule are ready, change ENABLE_BETA_CODE_LOGIN to true in Production. Redeploy the latest main deployment to apply the variable change. Wait for Ready, then open the live site and refresh with Ctrl+F5.

Open Farmer tools or Director Q while signed out. The temporary beta form should appear beside email sign-in. Test Owner and Q separately, using Sign out between accounts. Confirm Q can edit Q's Stall and another T1 stall, T2 remains read-only, and farmer email login still works. Complete the direct API/RLS checks in README.md before sharing access.

If the form is missing, check the switch is exactly true and the deployment includes the latest environment settings. “Beta login is unavailable” usually means a missing/invalid private variable, unconfirmed identity, or role mismatch. “Request rejected” means the site's origin does not match APP_ORIGIN.

## Emergency disable and larger demo requirement

Set ENABLE_BETA_CODE_LOGIN=false and redeploy. This stops new code logins but does not revoke existing sessions. Follow README.md to revoke sessions and remove the beta endpoint, form, and code variables before a larger demo. Protect or remove older beta deployments too, since they retain their own environment snapshots.

References: https://vercel.com/docs/git and https://vercel.com/docs/environment-variables/managing-environment-variables
