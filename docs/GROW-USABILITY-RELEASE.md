# Grow: connected plots, crops and recoverable deletion

Prepared September 17, 2026. Implemented locally; not pushed or deployed. This follows the original migration-010 planner release and the farmer usability feedback.

## What changed

The workspace now names one physical plot and groups its grid, crop list and selected crop controls together. The sequence is **name/shape the plot → add a crop → choose its position → save the plot**. Crop creation no longer requires a separate “Plan a crop” form elsewhere on the page. Selecting a crop exposes Move, Edit crop details and Record harvest for this crop, with that crop preselected in the harvest form.

The plot picker lists actual records. Creating a new plot is a separate button, and its draft name updates immediately in the picker with a “not saved” marker. Names start blank instead of silently saving another “New physical plot.” Existing duplicate names are retained and distinguished with a short identifier; no farmer records are renamed or deleted automatically.

White controls, one connected crop work area, numbered crop badges matching grid numbers, wider spacing and stacked phone/tablet layouts replace competing panels. Crop numbers stay stable when moving a crop. Advanced controls are progressively revealed; outline editing and placement have explicit mode instructions and a Done/Cancel action. Disabled buttons are visibly muted. Grid cells remain at least 48 × 48 pixels, with horizontal scrolling for large plots.

## Delete a plot

Choose the plot, open **Manage plots · delete or restore**, and select **Delete this plot**. Confirm to remove it from the active dropdown. A user can do this only for a farm where their normal Grow access permits editing. An unsaved draft is not a database record; starting another plot offers a discard confirmation instead.

This is recoverable deletion (archiving), not permanent erasure. The confirmation and help explain that crop details, harvest records and all saved layout versions are retained. In the same Manage plots section, **Deleted plots → Restore [name]** returns the plot to the dropdown and opens it with its geometry intact. Deleting a plot does not remove its crop records from “Use a saved crop” or the saved-record/harvest views.

## Migration 011 before deployment

Migrations 008–010 must already be installed. Do not rerun 009 or 010. The existing Owner switch remains unchanged.

If records have changed since the last backup, take a fresh archive using the backup procedure in `GROW-PLANNER-RELEASE.md`, changing the backup filename prefix to `before-recovery-011-`. Verify the archive listing before proceeding.

From the project PowerShell folder:

```powershell
Get-Content -Raw .\supabase\migrations\011_grow_plot_recovery.sql | Set-Clipboard
```

Paste into a new Supabase SQL Editor query and Run once. Expect “Success. No rows returned.” This migration adds recovery fields, a guard against editing deleted plots, and a permission-checked archive/restore function. It does not delete or archive any existing records.

Do not run files under `tests/` in Supabase. Those database scripts create and modify synthetic local test data.

## Save boundaries and failure handling

Crop details and layout positions retain their existing separate storage and identities. **Save crop & choose position** first saves the crop record, then opens placement on the current plot. **Save plot changes** commits the outline and positions. The screen explicitly names both saves. Canceling placement keeps the saved crop available under “Use a saved crop.” Save plot is disabled during unfinished placement or edited crop details.

New crop forms use a stable UUID for insert retries. If a response is interrupted after the insert commits, retrying recovers that same record through ordinary RLS and applies the current form values rather than creating another crop. Editing dates retains the crop ID and all linked harvests. Crop saves update the local crop list without reloading/unmounting an unsaved plot draft. Existing harvest records and correction history remain available.

Layout and crop/harvest draft changes participate in the existing navigation warnings. Drafts remain memory-only: a crash can lose unsaved work. An uncertain archive/save response asks the user to reload and inspect server state before retrying. Conflict errors retain the current draft.

## Security and data model

- Migration 011 adds `grow_layouts.archived_at` and `grow_layout_revisions.is_archived`. Existing RLS continues to cover reads; only the UI's active list excludes archived rows so authorized users can restore them.
- `drn_archive_grow_layout` uses an empty search path, requires `auth.uid()` and `drn_can_grow(target_farm)`, checks farm ownership and expected revision, and locks the same layout ID as the normal save RPC. It atomically updates archive state, advances the revision and appends an audit snapshot.
- A database trigger rejects ordinary save attempts on an archived plot, including calls from older clients. Restoring advances the revision again so a stale editor cannot overwrite the restored version. Clients still cannot directly update or delete the tables.
- Q's cross-T1 Sell role does not grant cross-farm Grow access. Ordinary membership and the existing temporary Owner support switch apply to delete and restore as well. T2 and anonymous mutations remain denied.
- No new service key, dependency, tracking service, public publication or billing was added. Changed code uses the existing authenticated Supabase client. This is a focused review, not a full repository security audit.

## Verification

- Production build/TypeScript and ESLint.
- Browser regression with mocked Supabase: distinguish legacy duplicate plot names, update draft labels, reject an unnamed save, retain crop form when navigation is canceled, retry crop insertion without duplication, place/overlap/move crops, preserve numbering, edit dates, retain a draft on version conflict, preselect the crop for harvest, reload saved layouts, cancel/delete/restore, deny an unrelated farm, and verify no page overflow at 320/390/768/1024/1440px.
- Screenshots inspected at phone, tablet and desktop sizes. Grid cell targets checked at 48px minimum. These are browser viewport checks, not certification on physical devices or a full accessibility audit.
- PostgreSQL 18 local disposable database: delete/restore revisions, crop and harvest preservation, stale-save rejection, archived-edit rejection, direct-write denial, Q own-farm access versus unrelated denial, Owner switch off/on, T2 and anonymous denial.

`tests/grow-flow.browser.cjs` requires Playwright (or `DRN_PLAYWRIGHT_PATH` pointing to an existing installation) and a production build running on localhost:3100. It intercepts all Supabase calls and uses synthetic identities. The cookie project reference matches this project's public Supabase reference; adjust it if testing another project. `tests/grow-layout-archive-db.sql` runs after `tests/grow-layout-db.sql` on a fresh disposable database, never on a real farm database.

## Release and Q acceptance

After applying 011, publish these scoped files from the project PowerShell folder:

```powershell
git add src/app/grow-planner.tsx src/app/grow-crop-form.tsx src/app/grow-tools.tsx src/app/globals.css src/app/farmer-tools.tsx src/app/page.tsx supabase/migrations/011_grow_plot_recovery.sql tests/grow-flow.browser.cjs tests/grow-layout-archive-db.sql docs/GROW-USABILITY-RELEASE.md docs/GROW-PLANNER-RELEASE.md docs/PRODUCT-PRINCIPLES.md docs/Grow-Flow-Mobile.png docs/Grow-Flow-Tablet.png docs/Grow-Flow-Desktop.png
git diff --cached --stat
git commit -m "Connect Grow plot and crop workflows with recoverable plot deletion"
git push origin main
```

Wait for Vercel Ready. Review images are `Grow-Flow-Mobile.png`, `Grow-Flow-Tablet.png` and `Grow-Flow-Desktop.png`; all use synthetic test records. No Vercel variable changes are needed. Keep the previous deployment available for UI rollback; do not drop recovery columns or delete retained records. An old build may still list archived plots, but its saves are blocked until they are restored in the new UI.

Q should test on Q's Stall with synthetic crop records: create a named plot, add carrots, choose its position, save and refresh, add an overlapping second crop, move either by name, record a harvest, delete the plot and restore it. Report observations through **Director Q → Plot planner**. Owner should check one authorized T1 support farm and confirm T2 remains protected.

Temporary operator code login remains subject to `ENABLE_BETA_CODE_LOGIN` and removal before the larger demo. Removing its Design Journey callout did not waive that requirement. The Owner Grow support exception remains disclosed and request-only for real farmer data, and must be disabled/removed when leaving the controlled beta.
