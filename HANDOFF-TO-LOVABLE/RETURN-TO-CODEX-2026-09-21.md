# Return to Codex — Detroit Root Network UI review round 2

Date: 2026-09-21 (UTC)
Approved by: Nile Tate and Quinn Hamilton (both approvals recorded before packaging)
Source of record: `WORKSPACE-CHANGE-LOG.md` (audit entries DRN-0001 through DRN-0026)

## What this package is

The original Next.js 16 App Router handoff source with the UI, wording and
behaviour changes Nile and Quinn approved during review. The Lovable review
build (TanStack Start) was a preview surface only; nothing from it ships. No
preview shims, mock database, or TanStack route files are present in this
package.

## Changes included (audit IDs)

- DRN-0001..0003 — quieter desktop navigation, compact nutrition filter bar,
  one shared numbered result list feeding cards and map markers.
- DRN-0005 — interim Farmers Grow planner: plot name plus feet dimensions
  (width <= 500 ft, length <= 200 ft) recorded as metadata; the 12x12 planning
  geometry is unchanged and the visual layout step is paused.
- DRN-0006 — brief items 1-7: upright pin numbers, tooltip shows farm name only,
  "Customers Buy" / "Farmers Sell" / "Farmers Grow · Beta" labels, "Trust through
  clarity" moved from Mission to Design Journey, labelled trash icon, Owner
  language naming Nile and Quinn.
- DRN-0007..0009 — Route Roots directions action no longer overlaps the last
  stop on desktop or phone, Root Route re-ranks stops by how much matching
  produce each location carries for the selected nutrition goal, search bar
  aligns to the map edge with spacing below.
- DRN-0010..0013, DRN-0018 — alerts sign-up: spacing before the contact field,
  "Alerts about" location scope covering every listed location, weekly or
  instant digest choice, new heading, and a Volunteer opportunities alert type.
- DRN-0011 — per-location follow panel (`src/app/farm-alert-signup.tsx`) in the
  farm details view, with wording "Get alerts from this location" and its own
  weekly/instant choice.
- DRN-0021..0023 — Mission page copy as written by Quinn, plus the City of
  Detroit Community Health Assessment / CHIP paragraph and links, and the Grow
  Moore Produce Cooperative link.
- DRN-0024 — Community Board card clean-up: equal-height cards, single badge
  baseline, divided date and neighbourhood meta block, full-width pill action,
  serif event titles.

## Validation run on this package

- `npm ci` — clean install.
- `npm run lint` — 0 errors, 2 pre-existing warnings (`grow-crop-form.tsx` unused
  `unit`, `grow-planner.tsx` unused `place`), both carried over from the
  baseline.
- Tests: `node tests/beta-login.test.cjs` 8/8, `node tests/grow-layout.test.cjs`
  3/3, `node tests/recruiter-access.test.cjs` 7/7 — 18/18 pass.
  One test assertion was updated: `newLayout().cells.length` now expects 144
  (12x12) instead of 16 (4x4), matching the DRN-0005 planner default. No other
  test was changed.
- `npm run build` — compiles successfully.

## Codex release correction

Release review found that migration 010 allowed exactly three layout-document
fields, while the returned Farmers Grow interface saves a fourth `plot_size`
field. Without a follow-up migration, Supabase would reject the save as
`Unknown layout fields`. The release candidate now includes
`supabase/migrations/013_grow_plot_dimensions.sql`, which preserves the original
authorization, revision, archive-trigger, crop-ownership and geometry checks
while allowing only validated optional dimensions: width 1-500 whole feet and
length 1-200 whole feet. Unknown fields remain rejected. New plots require both
dimensions before crops or the plot can be saved; legacy layouts remain readable
and editable without silent conversion.

Codex also removed two dead-code lint warnings and aligned the optional browser
flow test with the paused visual grid and automatic crop-list placement.

## Open items for Codex / the team

1. Read-check the City of Detroit 2025 Community Health Assessment data briefs
   PDF cited on the Mission page. The City's site blocks automated downloads, so
   the four CHIP priorities quoted in that paragraph were confirmed from
   Detroit's own public announcement rather than the PDF itself (DRN-0022).
2. DRN-0004 — scaled large-plot planner (brief item 8) remains deferred pending a
   design decision from Nile.
3. DRN-0012 — production decision on which validated outlets and resource hubs
   populate the follow list is owned by Nile; the review build carries sample
   locations only.
4. Alert sign-up and the location follow panel do not send messages; they are
   demonstration UI awaiting the production notification service.
5. Apply migration 013 in Supabase before deploying the application commit. The
   UI and database change are one release unit.
