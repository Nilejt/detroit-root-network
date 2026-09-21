# Codex release validation - September 21, 2026

## Outcome

Release candidate approved for Git/Vercel Preview after one required correction.
Do not merge to production until migration 013 is applied and preview acceptance
testing passes.

## Release blocker found and corrected

The returned Farmers Grow UI added `plot_size` to each saved layout document,
but the deployed migration 010 save function rejects any fourth document field.
The browser-only and Node test suites did not exercise that database contract.

Correction included:

- Added `supabase/migrations/013_grow_plot_dimensions.sql`.
- Preserved Supabase identity, `drn_can_grow`, T1/T2 boundaries, crop ownership,
  revision locking, immutable history, archive protection, geometry limits and
  function grants.
- Allowed only an optional `plot_size` object with exactly `width_ft` and
  `length_ft`.
- Enforced whole-number limits of 1-500 ft wide and 1-200 ft long.
- Continued accepting legacy three-field layout documents.
- Continued rejecting unknown fields.
- Required dimensions in the interface before a new plot can add crops or save.
- Updated disposable SQL fixtures and the optional browser-flow harness.
- Removed two unused-code lint warnings.

## Automated checks

Run on the corrected package:

- `npm ci` - passed.
- `npm run lint` - passed with zero warnings and zero errors.
- `node --test tests/*.test.cjs` - 18 of 18 passed.
- `npm run build` - passed; TypeScript and all six application routes compiled.
- Source/test/migration diff whitespace check - passed.
- Package scan - no new dependencies, private keys, access codes, service-role
  credentials, hidden authentication paths or undocumented outbound services
  found in the changed code.

## Checks not performed in this environment

- The disposable PostgreSQL contract fixtures were updated but not executed
  because this environment does not provide a local PostgreSQL server. Apply
  migration 013 to the Vercel Preview's Supabase project and perform the listed
  valid/invalid dimension checks before production merge.
- The optional Playwright authenticated Grow harness was updated but not run
  because Playwright is not a project dependency in this package.
- The City of Detroit CHA/CHIP URLs returned HTTP 403 to automated review. The
  linked MDPI study was reachable and supports the 3,499, 2,884 and 615 outlet
  figures. Manually open the City links during preview review.
- Alert controls remain demonstrations and do not store contact information or
  send messages, as the interface states.

## Release boundary

The application code and migration 013 are one release unit. The corrected ZIP
is ready for a Git feature branch and Vercel Preview. Production merge remains a
human approval after the preview checklist in `docs/RELEASE-2026-09-21.md`.
