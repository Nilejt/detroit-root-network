# Grow plot planner — activation and handoff

Prepared September 17, 2026. Implemented and locally tested; this document does not certify a live deployment or that migration 010 has been applied to Supabase.

## Included in this update

- Private physical plots with explicit feet/meters, rectangles up to 12 × 12, and individually editable boundary cells. Create multiple physical plots for larger farms.
- Existing dated crop plans become named, colored rectangular layers; tap to place/move, arrow nudges, overlap chooser and explicit overlap confirmation. Large cells scroll on phones instead of shrinking.
- Save/reload, Undo, navigation warnings for unsaved layout changes, and immutable saved revisions. A stale editor cannot overwrite a newer saved revision.
- First-use walkthrough, reopenable help, and **Plot planner** in Director Q's existing feedback form.
- Design Journey at `/design-journey`, before Director Q in navigation; `/recruiter` redirects, with the same presentation code. Removed the bottom temporary-login callout and duplicate bottom checklist item.
- Consistent white stall cards with stronger borders. Produce, location and hours remain visible at the top level.

## 1. Back up before migration 010

Use the project PowerShell window. This prompts for your **database password**, not your Supabase account password. Do not paste passwords into chat or source files.

```powershell
$backupDir = Join-Path $env:USERPROFILE 'Documents\DetroitRootNetwork-Backups'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$backupFile = Join-Path $backupDir ("before-layout-010-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.dump')
$env:PGSSLMODE = 'require'
& 'C:\Program Files\PostgreSQL\18\bin\pg_dump.exe' -h aws-0-us-west-2.pooler.supabase.com -p 5432 -U postgres.ttlyvtuswruubhjuntsu -d postgres -W -Fc -f $backupFile
$dumpExit = $LASTEXITCODE
if ($dumpExit -ne 0) { throw 'Backup failed. Do not run migration 010.' }
& 'C:\Program Files\PostgreSQL\18\bin\pg_restore.exe' --list $backupFile | Out-File "$backupFile.contents.txt"
if ($LASTEXITCODE -ne 0) { throw 'Archive check failed. Do not run migration 010.' }
Get-Item $backupFile | Select-Object FullName, Length
Write-Host 'Backup created and archive listing verified. This is not a full restore test.'
```

An older pre-008 backup does not include subsequent farmer records. Keep backups outside Git and deployment ZIPs.

## 2. Apply the single new migration

Prerequisite: migration 008 already installed. **Before today's Owner Grow test, check migration 009** in Supabase SQL Editor:

```sql
select to_regclass('public.grow_beta_settings') as migration_009;
```

If it returns NULL, copy and run the entire `supabase/migrations/009_grow_owner_beta_access.sql` first:

```powershell
Get-Content -Raw .\supabase\migrations\009_grow_owner_beta_access.sql | Set-Clipboard
```

If it returns `grow_beta_settings`, 009 is already installed; do not rerun it. Migration 009 initially leaves Owner support **off**. Enable it with the separate SQL below before cross-farm testing.

Next, in Supabase SQL Editor, run **all of `supabase/migrations/010_grow_layouts.sql`** once. It is one transaction, including tables, RLS, indexes, validation, and the save function. Do not paste `tests/grow-layout-db.sql` into Supabase; that file creates a disposable test environment only.

From the project PowerShell folder, copy the migration:

```powershell
Get-Content -Raw .\supabase\migrations\010_grow_layouts.sql | Set-Clipboard
```

Paste into a new SQL Editor query and Run. Expect “Success. No rows returned.” The migration preserves existing crop and harvest records and does not invent coordinates for them. It does not enable the Owner support switch or alter memberships.

Check the installed objects and existing Owner switch:

```sql
select to_regclass('public.grow_layouts') as layouts,
       to_regclass('public.grow_layout_revisions') as revisions;
select owner_support_enabled from public.grow_beta_settings where id = true;
```

If Owner cross-T1 support was intended but the switch is false, the previously authorized beta setting is:

```sql
update public.grow_beta_settings set owner_support_enabled = true where id = true;
```

This is separate from migration 010. The farmer-facing disclosure is already present. Use synthetic data for independent testing; inspect real farm data only when that farmer asks for support. Q needs her existing Q's Stall membership for Grow; her cross-T1 Sell access does not grant access to other private Grow records.

## 3. Publish this update

No new Vercel environment variables are required. Keep existing private login variables and switches unchanged. Stage only the release files listed in `RELEASE-DESIGN-JOURNEY.md`, commit, and push to `main`; Vercel then builds from GitHub. Wait for Ready and validate the live site. If 010 is absent, the planner shows an unavailable message while the existing crop and harvest forms still work.

## 4. Q's live test

1. Sign in using her existing account, open **Farmer tools → Q's Stall → Farmer Grow**.
2. Follow the walkthrough; save a crop plan below the grid with planting/harvest calendar dates and optional notes.
3. Name a physical plot, choose units, apply a rectangle, and add one boundary cell.
4. Choose the saved crop plan, set its footprint, choose placement, and tap its top-left square.
5. Add another crop, confirm an intentional overlap, choose each layer by name, move it, and change its color.
6. Save layout, refresh, return to Grow and confirm it persisted. Review revisions; use an earlier revision as a draft only if desired.
7. Save any edits, then open **Director Q → Plot planner**, enter what she tried/expected/observed, and submit through the existing feedback mechanism.

Owner should also verify access to another T1 test farm, and verify T2 remains unavailable for editing. Do not use another farmer's real records for independent QA.

## Architecture and boundaries

`grow_plots` retains its existing IDs and dated crop-plan fields, so `grow_harvests` and `grow_history` remain valid. The UI now calls these **crop plans** to distinguish them from physical space. `grow_layouts` stores each physical plot's name, fixed unit, whole-cell boundary, and crop-plan references. `grow_layout_revisions` records every successful save. Restoring a revision creates a draft and then a new revision, never rewrites the old one.

The document contract is in `src/lib/grow-layout.ts`; SQL validates it independently. Each boundary cell is a row-major integer on a 12-column canvas. Layers hold the existing crop UUID, x/y, width/height, and a six-digit hex color. Each crop appears once per physical plot; a crop may be represented on more than one physical plot, so this is not acreage or yield accounting.

Clients have SELECT only on the new tables, filtered by RLS and `drn_can_grow`. The sole client write interface is `drn_save_grow_layout`, a narrowly scoped security-definer function with empty search path. It explicitly checks the normal Supabase user and existing Grow access, validates structure/limits/farm ownership/bounds/units, serializes saves, checks the expected revision, and atomically writes both current layout and its snapshot. No service key is used by the planner. Anonymous users have neither table reads nor function execution.

Q and farmers require membership; the existing temporary Owner switch permits cross-T1 support. T2 is denied for everyone. Revisions share the same private access boundaries. No data is automatically copied into Sell, public listings, volunteer posts, analytics, or an external service. No dependencies were added.

## Verified locally

- Production build and TypeScript; ESLint.
- 18 Node tests covering beta authentication, presentation gate, and geometry.
- PostgreSQL 18 disposable database: migrations 008/009/010; member writes, Q isolation and own-farm access, Owner switch off/on, T2 and anonymous denial, direct-write denial, immutable revisions, stale-save rejection, foreign-farm crop rejection, bounds and fixed-unit checks.
- Mocked browser workflow: shape/Undo, overlap chooser, movement, save/reload, stale-save draft preservation, navigation confirmation, revision history, feedback choice, and no page overflow at 320/390/1024px.

The SQL tests use a minimal synthetic base schema and Supabase identity stub. Browser tests mock the Supabase responses. Neither substitutes for post-deployment checks against the live project. Existing broader production RLS, a full backup restore, real-device touch behavior, and full accessibility testing are not certified by these checks.

## Deliberate beta limits / recovery

One plot is focused at a time; there is no whole-farm positional map. Crop footprints are rectangular, while physical boundaries can be irregular. Resize a crop by removing its layer and placing the same saved crop plan again. All dates appear together; there is no succession/date filter, crop-spacing advice, forecast, or automatic compatibility inference. Layer visibility is a temporary viewing preference.

Layout drafts live in memory, not browser storage. Standard workspace/farm/navigation changes warn before discarding layout edits; a browser crash can still lose unsaved work. Save before switching devices. Existing crop/harvest forms are separate saves; save a crop plan before placing its layer. Save errors preserve the layout draft; after an uncertain network response, reload to confirm the server's state. The history view loads the latest 20 revisions; older revisions remain in the private database.

If UI problems appear, redeploy the previous Vercel build and retain the additive tables and saved records for diagnosis. Do not drop tables or revert crop IDs to roll back the UI.

**Before a larger demo, remove temporary Owner/Director Q code login, including the documented session/old-deployment retirement steps. Keep `ENABLE_BETA_CODE_LOGIN` available until removal. The Owner Grow support exception must also be disabled/removed before leaving the controlled beta. Removing a Design Journey callout does not waive either requirement.**
