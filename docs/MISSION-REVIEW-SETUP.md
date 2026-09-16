# Mission suggestions and Owner publication

## Deployment

1. Make a fresh database backup using the existing PowerShell backup procedure.
2. Run `supabase/migrations/007_mission_review.sql` once in Supabase SQL Editor. It adds two editorial tables and an approval function; it does not alter farm tables, roles, memberships, or T2 policies.
3. Deploy the application update through GitHub/Vercel. No new secrets or environment variables are required.
4. Sign in through Farmer tools as Director Q, then open Director Q. Use Mission page feedback to select a section. The public mission page has no editorial controls. Submit replacement wording and a comment. Suggestions are saved in Supabase and survive browser closure.
5. Sign in as Owner and open Director Q → Mission page feedback to review the current text alongside the proposal. Choose Review publication, then Approve and publish, or Reject. Approved copy appears for visitors on their next load, without a new deployment.

If migration 007 is missing, the original mission still renders and editing is unavailable. Unsaved form text is not persisted: submit the suggestion before leaving the page.

## Editorial behavior

Six sections can be edited, including the hero. Proposed text is plain text, not executable HTML or Markdown. Approval replaces a section's heading and body; a section containing cards becomes paragraphs. Source links remain in a permanent references area. Review any new factual claims and update sources in code if needed.

Suggestions are immutable. To change a submitted draft, submit a new suggestion. A revision check prevents approving old suggestions over newer published copy. Previously approved and rejected suggestions remain in the private history; to restore earlier wording, submit it again against the current revision and approve it.

## Security boundary

The client uses the normal public Supabase key and signed-in session. Public readers can see only `mission_sections`. Only Owner and Director Q can read or insert `mission_suggestions`; insert grants exclude identity, status, timestamps, and review fields. Neither role can directly change published sections or suggestion status through ordinary table writes. The approval RPC verifies the current database role is Owner, locks the relevant records, checks the base revision, and atomically records publication and reviewer. No service key is used by the editorial feature.

The recruiter code does not grant editorial access. Existing farmer and T2 permissions remain unchanged. There is no new login or beta bypass.

## Required live acceptance checks after migration

- Anonymous visitor: original/approved content loads; direct suggestion reads and writes fail.
- Ordinary farmer: no editorial controls; direct draft inserts and approval calls fail.
- Director Q: create and reload a suggestion; direct publication, status changes, author spoofing, and approval RPC calls fail.
- Owner: approve one suggestion; public copy updates and private comment stays private. Rejection preserves published text.
- Submit two suggestions at the same revision. Approve one; approving the second must fail as stale.
- Submit text containing HTML tags or script-looking text. Preview and publication must display it as text, never execute it.
- Sign out: private drafts and controls disappear. Recheck farm access and T2 protection.

Local lint/build and mockup interaction checks do not replace these live database permission checks. Migration 007 has not been applied to the remote database by this change.

## Design preview

`DRN-Site-Experiences-Preview.html` is a standalone sample showing Customer Find, Farmer Sell, Farmer Grow, and the mission review flow in the proposed green palette. It has no expiration and uses sample data only. Its simulated role buttons are not authentication. `DRN-Site-Experiences-Source.html` preserves the editable source. The live application palette is unchanged pending review of this mockup.
