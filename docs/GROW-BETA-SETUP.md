# Activate the first Grow beta

**Beta support update:** Migration 009 optionally grants temporary Owner access across T1 farms through an administrator-controlled switch. It does not expand Q's access. The membership-only behavior described below is the baseline when that switch is disabled. See `GROW-OWNER-SUPPORT.md` for farmer notice, request-only use, and the mandatory production cutoff.

## What ships

Farmer tools now has Farmer Sell and Farmer Grow tabs for the selected farm. Grow supports saved plot/crop plans, planting and planned harvest dates, optional soil and growing notes, harvest quantities with explicit units, corrections, and private correction history. Changing farms resets the Grow workspace. Forecasting, automatic weather feeds, volunteer predictions, long-range scenario planning, billing, and automatic inventory publication are not part of this release.

## Activation

1. Make a fresh database backup using the existing backup procedure.
2. Apply `supabase/migrations/008_grow_beta.sql` once in Supabase SQL Editor. No new environment variables are needed. Migration 007 remains required for mission suggestions.
3. After Vercel deploys this commit, sign in and select Farmer tools → Farmer Grow.
4. Q should select Q's Stall: migration 005 already assigned her membership there. Other farms require an explicit `farm_members` entry for the signed-in user. The platform Owner role alone does not reveal private Grow records. Use Supabase Table Editor to verify the intended farm UUID and user UUID before assigning membership; do not grant every farm automatically.

Grow is private to explicit T1 farm members. There is no automatic creator/Owner/operator exception. SQL checks membership independently of the UI, and an unaffiliated operator receives an access message. Existing sale access and T2 protection are unchanged. No real database migration has been executed by this code change.

## Data and corrections

`grow_plots` records a plot/crop/season plan. `grow_harvests` references that plot and the same farm through a composite foreign key, preventing cross-farm associations. Quantity must be positive, with units recorded; different units are never silently combined. Planned dates are entered by the farmer, not generated forecasts.

Updates preserve the previous row in `grow_history` through a database trigger. Clients cannot overwrite or delete history, change the farm on an existing row, or delete records. The UI shows the latest 30 corrections. To keep historical meaning, create a new plot/crop plan for a new crop or season instead of repurposing an old one. Changes do not alter sale inventory or publish growing notes.

## Live acceptance checks before broader use

- Q saves a plot and harvest on Q's Stall; reload and confirm persistence.
- Correct a quantity; confirm the prior value appears in correction history.
- Switch to another farm without membership; confirm access is denied, including direct REST reads/writes.
- Anonymous visitors and unrelated farmers cannot read any of the three Grow tables.
- Confirm attempts to attach a harvest to another farm's plot fail; T2 membership still gives no Grow access.
- Confirm an Owner without membership has no private access; add a deliberate test membership to grant access if needed.
- Missing migration or a connection error produces an unavailable message, not a successful save.
- Confirm Farmer Sell still works and public inventory does not change after recording harvests.

Local browser tests use simulated Supabase responses and do not certify live RLS. These live checks must follow migration installation.
