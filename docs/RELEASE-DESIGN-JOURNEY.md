# Design Journey, stall cards and Grow planner release

Prepared September 17, 2026. Supersedes the earlier prototype-only release plan.

See **GROW-PLANNER-RELEASE.md** for the backup, migration 010, Owner access check, architecture and Q test instructions. Apply migration 010 before publishing. No new Vercel environment variables are needed.

From the project PowerShell window:

```powershell
git add RECRUITER-SETUP.md src/app/page.tsx src/app/globals.css src/app/recruiter/page.tsx src/app/design-journey/page.tsx src/app/design-journey/recruiter.module.css src/app/api/auth/recruiter/route.ts src/app/farmer-tools.tsx src/app/grow-tools.tsx src/app/grow-planner.tsx src/lib/grow-layout.ts src/content/recruiter.json supabase/migrations/010_grow_layouts.sql tests/recruiter-access.test.cjs tests/grow-layout.test.cjs tests/grow-layout-db.sql docs/RELEASE-DESIGN-JOURNEY.md docs/GROW-PLANNER-RELEASE.md docs/GROW-LAYOUT-DIRECTION.md docs/GROW-PLOT-WALKTHROUGH.md docs/Grow-Plot-Planner-Preview.html docs/Grow-Plot-Planner-Source.html docs/PRODUCT-PRINCIPLES.md
git diff --cached --stat
git commit -m "Add private versioned Grow planner and Design Journey navigation"
git push origin main
```

Wait for Vercel Ready. Verify `/design-journey` uses the existing code and `/recruiter` redirects. Check white stall cards and top-level availability/address/hours. Then follow the live Grow checks in the planner release guide. Q can test on the live site and submit Plot planner feedback through Director Q.

The earlier standalone preview and its source remain archived in docs as design references. They use sample data and do not save real farm records. The live planner is now the testing destination after migration and deployment. Do not stage old deployment ZIPs, database backups, tmp/output folders, local environment files, or generated build files.
