# Technical and data guardrails

## Do not change

- Supabase project connection or environment-variable names.
- `supabase/migrations/` or any production table, function, trigger, policy, enum, seed record, or role.
- Authentication routes or callback behavior.
- T1 editable/T2 protected behavior.
- Server-only handling of private keys and disabled beta-code access.
- Nutrition matching rules or source references in `src/lib/nutrition.ts`.
- Public/private boundaries for Community Board events and interest.

## Security expectations

- Browser visibility is never an authorization control.
- Continue using the public Supabase client and signed-in session; never add a service key to client code.
- Never place secrets, access codes, tokens, or private URLs in source, prompts, screenshots, or the returned ZIP.
- Render user-provided text as text, not HTML.
- Do not add analytics, trackers, external scripts, or network services.

## Readability expectations

- Prefer a small named component over making `page.tsx` substantially harder to scan.
- Keep state ownership close to the interaction it controls.
- Use a `why` comment for non-obvious focus management or number synchronization.
- Keep CSS class names semantic and colocate responsive rules with the relevant component styles when practical.
- Record every changed file and why in the change log.

## Current stack

- Next.js 16 / App Router
- React 19
- TypeScript
- CSS with Tailwind available in the toolchain
- Supabase PostgreSQL and Auth
- Leaflet and OpenStreetMap
- Vercel deployment from GitHub `main`

