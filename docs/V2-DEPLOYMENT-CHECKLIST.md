# V2 deployment checklist

Validate each checkpoint before continuing. Do not run all deployment actions as one pasted PowerShell line.

## 1. Back up and inspect

- Confirm the local branch is based on commit `93628f5` or the intended newer V1 commit.
- Preserve a verified Supabase backup before changing the schema.
- Confirm the Vercel project still points to the intended GitHub repository and Supabase production project.

## 2. Install the package

From the Detroit Root Network project folder, expand the V2 ZIP into a separate review folder first. Review the diff, then copy or merge the selected files into the repository. Do not overwrite `.env.local`.

## 3. Verify locally

Run these separately:

```powershell
npm.cmd install
npm.cmd run lint
node --test tests/*.test.cjs
npm.cmd run build
```

Expected result: lint passes, 18 tests pass, and the production build completes.

## 4. Apply the database migration

- Open the Supabase SQL editor for the DRN project.
- Apply `supabase/migrations/012_v2_discovery_community.sql` after migrations 003–011.
- Confirm 15 published farms, with 5 T1 and 10 T2 records.
- Confirm Nile and Quinn have `owner` profiles.
- Add a `partner_members` record only after validating the partner identity and organization.

## 5. Preview before production

- Commit the reviewed changes to a V2 branch and push it.
- Create a Vercel Preview deployment.
- Test the mobile menu, nutrition sorting/map changes, Root Route, self-service stand, coming-soon item, Community Board, interest save, partner/farm event publishing, feedback export, and both owner beta codes.
- Directly test that an unauthorized user cannot edit T1 or T2 records or publish as a partner.

## 6. Release

- Merge the accepted V2 branch to `main`.
- Wait for Vercel to report Ready, then repeat the high-risk permission and mobile checks.
- Keep beta-code login enabled only for the small controlled test. Remove the beta route, form, secrets, and sessions before a larger demo.
- Review OpenStreetMap tile usage and choose a production tile provider before higher public traffic.

