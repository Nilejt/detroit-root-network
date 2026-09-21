# Detroit Root Network UI refinement handoff

Prepared for Quinn from production commit `5172a9c`.

## Purpose

Use Lovable to refine three presentation areas without changing Detroit Root Network's product scope, authentication, database behavior, or verified V2 workflows.

1. Simplify the fully expanded desktop navigation.
2. Make the panels shown after nutrition filtering more compact and elegant.
3. Clarify how numbered map markers correspond to farm cards.

This is a review workspace. Do not deploy, connect a different backend, apply SQL, merge to `main`, or overwrite the production project. Return an updated ZIP to Nile for review and deployment.

## Current product baseline

- Public discovery, farm cards, Detroit map, selling-now filter, nutrition objectives, predictive search, Root Routes, coming-soon produce, self-service stand signals, alerts demo, and the Community Board are working.
- Five T1 farms are editable; ten T2 farms are protected demonstration records.
- Supabase migrations 007 and 012 are applied to the current project.
- Email magic-link authentication is the intended sign-in path. Temporary beta-code login is disabled in Vercel.
- Basic food discovery and Farmers Sell must remain free.

## Recommended workflow

1. Upload this ZIP to a new Lovable workspace.
2. Paste the complete prompt from `LOVABLE-MASTER-PROMPT.md`.
3. Ask Lovable to explain its intended component/file changes before editing.
4. Review one visual area at a time: navigation, filter response, then map/card numbering.
5. Run the validation commands in `VALIDATION-AND-RETURN.md`.
6. Complete `LOVABLE-CHANGELOG.md`.
7. Export the complete project as a ZIP and return it to Nile.

## Acceptance principle

The redesign should make the page feel quieter and easier to scan. It must not make finding food slower, hide critical availability information, or introduce a second design system.
