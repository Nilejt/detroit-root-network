# Lovable master prompt

Copy everything below into Lovable.

---

You are refining the existing Detroit Root Network Next.js application supplied in this project. Preserve its current architecture and working features. This is a focused UI/UX assignment, not a rewrite.

## Product context

Detroit Root Network helps Detroiters find urban farms, current produce, selling locations, hours, prices, coming-soon harvests, volunteer opportunities, Root Routes, and verified community events. Farmers maintain operational information through a protected workspace. The product is mobile-first, community-centered, and keeps basic discovery and Farmers Sell free.

## Implement only these three refinements

### 1. Quieter expanded desktop navigation

- Keep `Find food`, `Community Board`, and `Farmer tools` visible as primary navigation.
- Place `Our mission`, `Design Journey`, and `Admin` in an accessible `More` menu on wider screens.
- Keep sign-out/account status visually separate from discovery navigation.
- Preserve the existing mobile burger interaction and all destinations.
- Do not remove, rename, or change route behavior.
- Ensure keyboard navigation, visible focus, Escape-to-close, outside-click close, and correct `aria-expanded`/menu semantics.

### 2. More elegant nutrition-filter response

- Reduce the visual footprint of the large post-filter information panels.
- Keep the selected nutrition objective, disclaimer, matching produce, and Root Route access visible.
- Prefer a compact active-filter summary, concise produce chips, and progressive disclosure for supporting explanation.
- Root Route may be a compact expandable action rather than a large persistent block.
- The cards and map must remain the dominant content.
- Do not hide the medical-advice disclaimer or nutrition-source access.
- Preserve the existing sorting and map-filter behavior.

### 3. Clear map/card numbering

- Title the map state `Matching locations` or an equally clear short label.
- Explain that marker numbers correspond to farm cards.
- Display the matching number on each visible farm card as well as its marker.
- Keep numbering stable for the currently displayed/sorted result set.
- Visually connect selected card and selected marker without relying on color alone.
- Keep T1/T2 labels separate from result numbers.
- Do not replace Leaflet, change map providers, geocode addresses, or change database records.

## Product and technical guardrails

- Work primarily in `src/app/page.tsx`, `src/app/globals.css`, and `src/app/detroit-map.tsx`. A small focused component may be extracted when it improves readability.
- Do not change Supabase tables, migrations, RLS policies, triggers, roles, authentication routes, environment-variable names, or API endpoints.
- Do not apply SQL or connect this workspace to a new Supabase project.
- Do not enable or redesign beta-code login. Email magic links remain the intended sign-in method.
- Do not modify T1/T2 edit protections.
- Do not remove or regress predictive search, selling-now filtering, nutrition sorting, coming-soon styling, Root Routes, alerts demo, Community Board, Farmers Sell, Farmers Grow, Admin feedback/export, Mission editing, or Design Journey.
- Do not add payments, monetization, unrestricted community posting, medical recommendations, diagnoses, or new health claims.
- Do not introduce new packages unless the change is impossible with the current stack. If proposing one, stop and explain why first.
- Do not deploy, push to GitHub, merge branches, alter Vercel, or change production configuration.

## Code readability requirements

- Use descriptive names and small focused components/functions.
- Preserve existing TypeScript types and improve them when a changed boundary needs clarity.
- Add comments only where they explain a non-obvious reason, constraint, accessibility behavior, or tradeoff.
- Do not narrate obvious JSX or CSS.
- Keep presentation behavior separate from authorization and data access.
- Avoid broad mechanical rewrites or unrelated formatting churn.

## Responsive and accessibility requirements

- Start at 360px mobile width, then verify tablet and desktop layouts.
- Maintain comfortable touch targets of approximately 44-48px.
- Support keyboard-only navigation and visible focus.
- Preserve semantic labels and screen-reader context.
- Avoid horizontal scrolling, clipped controls, overlapping buttons, and map overlays covering content.
- Respect reduced-motion preferences for any new transition.

## Required process

1. Inspect the existing files and summarize the current behavior.
2. Before editing, list the exact files you intend to change and the reason for each.
3. Implement only the approved scope.
4. Run `npm run lint`, `node --test tests/*.test.cjs`, and `npm run build`.
5. Report the exact results and any untested browser behavior.
6. Complete `HANDOFF-TO-LOVABLE/LOVABLE-CHANGELOG.md`.
7. Export the entire project as a ZIP without `.git`, `.next`, `node_modules`, `.env`, or `.env.local`.

## Definition of done

- Desktop navigation is visibly simpler while mobile navigation still works.
- Nutrition filtering produces a compact, legible response and retains its disclaimer.
- Map numbers and farm-card numbers clearly correspond.
- No existing feature or permission boundary regresses.
- Lint, tests, and production build pass.
- Quinn can explain every visible change from the completed change log.

---
