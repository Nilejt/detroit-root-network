# Lovable change log

Reviewer: Quinn (Lovable session). Date: 2026-09-20.

## Summary

- What changed: (1) Desktop navigation now shows four primary destinations with secondary destinations (Our mission, Design Journey, Admin) behind a "More" disclosure and Sign out separated into an account group; (2) the two stacked nutrition panels were replaced by a single slim active-filter bar with Root Route as a compact expandable action; (3) map markers and result cards now share one numbered result list, and each matching card shows its map number next to the tier tag.
- What intentionally did not change: data model, Supabase access, auth, API routes, card content, availability/coming-soon information, nutrition taxonomy, result sorting, and which farms the map plots. No new design system, fonts, or color tokens; only existing tokens were reused.
- Main UX rationale: quiet the chrome around the find-food flow and remove a real correspondence bug, without adding steps or hiding availability.

## Files changed

| File | Change | Reason |
| --- | --- | --- |
| `src/app/primary-nav.tsx` (new) | `NavMore` disclosure component with `aria-expanded`, Escape-to-close plus focus return, and outside-click close | Keeps secondary destinations reachable but visually quiet |
| `src/app/page.tsx` | Nav restructured; nutrition panels collapsed into one `.filter-bar`; added `mappedFarms` + `resultNumbers` memos; card number badge; map receives shared numbers | Areas 1-3 |
| `src/app/detroit-map.tsx` | Accepts `numbers` and `filtered` props; markers render shared numbers; map key retitled | Numbers must match the cards |
| `src/app/globals.css` | Added nav disclosure, account group, `.filter-bar`, `.card-number` rules plus mobile overrides (append-only; no existing rules edited) | Presentation for the above |

## Navigation review

- Desktop behavior: Find food, Community Board, Farmer tools (plus Partner tools when signed in) stay inline. Our mission, Design Journey and Admin sit in a "More" panel. Sign out moved from first position into a separate account group at the end.
- Mobile behavior: unchanged in substance — the burger menu still renders every destination in one flat list (the More panel is rendered inline below 850px and its toggle is hidden), so nothing is buried on small screens.
- Keyboard/focus behavior: toggle is a real button with `aria-expanded`; Escape closes and returns focus to the toggle; outside mousedown closes; panel items are ordinary links/buttons in DOM order. The unsaved-planner guard (`leavePlanner`) is preserved on every destination.

## Filter response review

- What became more compact: the ~200px `.nutrition-context` + `.route-root` stack is now one row roughly 90px tall: "Objective", the objective name, matching produce chips, and right-aligned actions. Cards now appear above the fold on desktop and much sooner on mobile.
- How the disclaimer remains visible: it is persistent small text inside the filter bar (not a tooltip, not collapsed). The "How nutrition matches are sourced" `<details>` block is unchanged.
- Root Route behavior: unchanged logic and unchanged stop list/sorting; it is now a quiet "Root Route (N stops)" toggle with `aria-expanded` that expands the same plan panel, including the multi-stop directions link. It still only appears at 3+ matching farms.

## Map/card numbering review

- Numbering rule: one list (`mappedFarms`) is derived from the visible results — all results when no objective is active, otherwise the farms with currently available matching produce, in display order. `resultNumbers` maps farm id to position, and the same map feeds both the card badges and the marker HTML. Marker 3 and card 3 are now always the same farm.
- Card presentation: the number is a filled square badge, visually distinct from the pill-shaped T1/T2 tier tag, with an `aria-label` of "Map location N". Non-matching farms remain listed (availability is never hidden) and simply carry no map number, since they are not plotted.
- Selected state: there is no persistent selected card state in this build — tapping a card or marker opens the detail dialog, so no ring/inversion state was invented. See recommendations.
- Behavior after filtering/sorting: numbers recompute with search, region, quick filter and objective changes, so cards and markers stay in sync.

## Validation

- `npm run lint`: pass (no warnings), before and after.
- `node --test tests/*.test.cjs`: 18/18 pass (3 test files: beta-login, grow-layout, recruiter-access), before and after.
- `npm run build`: pass, TypeScript clean, same route table as baseline.
- Viewports manually checked: 1440, 1024, 768 and 360 px via headless Chromium against `npm run dev`; no console errors at any width. Checked with no objective and with "Heart-smart nutrition" active.
- Known limitations or untested behavior: no authenticated session was used, so Partner tools/Admin views and the signed-in nav variant were verified by code path only, not visually. Leaflet markers still overlap at the demo zoom when farms are geographically close (pre-existing).

## Questions or recommendations for Nile

- Scope note: the map/card numbering fix is a behavior change, not pure presentation. Nile explicitly approved it in this session (2026-09-20) before it was made.
- Recommend adding a persistent selected state (ring on the card plus inverted number badge) so a marker tap highlights its card as well as opening the dialog — deliberately not invented here.
- Consider marker spiderfy/clustering for overlapping locations.
- Numbering deliberately applies only to plotted (matching) farms; if you would rather number every visible card, that is a one-line change to `mappedFarms`.
