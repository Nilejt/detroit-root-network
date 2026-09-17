# Grow layout — direction and implementation status

Design direction from Nile, September 16, 2026. Update September 17: the first persisted planner is implemented with migration 010. See GROW-PLANNER-RELEASE.md for activation, verified scope and remaining limits. The sections below retain the broader design direction; date filtering, whole-farm positioning and arbitrary crop shapes remain proposed.

## Core distinction

A plot is a physical growing space. A crop planting is a dated layer within that space. The existing beta stores plot, crop and season together; separate those concepts in a future migration without losing current harvest links or correction history. Do not reinterpret existing records or duplicate them silently.

## Farm layout

Choose a cell scale explicitly (for example one square foot or one square meter), then create a width-by-length plot. Add or remove single cells to describe irregular boundaries. Keep scale visible and consistent within a farm layout; grid geometry is farmer-entered planning data, not a surveyed boundary.

Start with rectangles and whole-cell shapes. Avoid freehand drawing, rotation at arbitrary angles, or satellite overlays in the first iteration. Keep walkways and no-plant areas separate from crop layers. Moving a plot changes its position on the layout; it must not change crop dates.

## Add a crop

1. Choose crop type; allow custom names.
2. Set footprint width and length in the chosen units. Keep plant count and plant spacing separate: crop size must not ambiguously mean all three.
3. Place the crop layer inside a plot; optionally add/remove footprint cells.
4. Choose planting date using a calendar field.
5. Add optional notes, soil information, and expected harvest date through calendar fields. Initially the harvest date is the farmer's estimate, not a computed forecast.
6. Review and save. Keep draft state on validation or network failure.

## Phone and tablet interaction

Use large labeled controls and approximately 48px touch targets. Do not fit an entire large farm into tiny tappable cells: zoom or focus on one plot. Default to scrolling/panning; require an explicit Move or Paint mode to avoid accidental edits. Support tap layer → Move → tap destination, plus arrow nudges and numeric position inputs. Dragging is an optional shortcut, never the only mechanism. Provide Undo, Cancel and a clear Save state.

## Overlapping crop layers

Assign contrasting translucent fills with solid selected outlines and editable colors. Keep crop names and identifiers visible; never rely only on color. A layer list shows crop, planting date, visibility and selection, with hide/show and isolate controls. Tapping an overlap opens a small chooser naming all layers at that location.

Use a date filter to distinguish succession plantings from crops planned for the same time. Warn about simultaneous overlaps and out-of-bounds placements; allow the farmer to confirm intentional intercropping. Do not infer compatibility or recommend spacing without reliable crop-specific sources.

## Rollout sequence

- Immediate Grow usability: action-first entry points (Plan crop / Record harvest), compact saved-plan summaries, clear selection state, preserved drafts when changing sections, and large touch controls. Keep the beta data-access notice visible but concise.
- Next: prototype one plot, irregular cells, crop layers, tap-to-move, overlap selection, undo and date filtering on phones and tablets. Validate with Q before schema work.
- Then: persist versioned layout geometry and separate crop plantings, migrate existing harvest relationships, and verify membership access and the temporary Owner switch against the new tables.
- Later: comparisons by crop and compatible units, seasonal estimates with disclosed assumptions, and multi-year scenarios.

## Useful first insights

Show planned versus actual harvest dates and quantities where comparable records exist; never total incompatible units. Flag missing dates and possibly conflicting planting windows as review prompts. Keep missing records distinct from zero harvest. Preserve historical geometry or a version link so changing a bed today does not redraw last season's records. Forecasts must never automatically become sale inventory or public volunteer posts.

## Acceptance before deployment

Check one-handed phone use, tablet use, keyboard/tap alternatives, accidental drag prevention, overlap selection, undo, failed-save recovery, private access, history preservation, and large-plan performance. The user approved including the first persisted planner in the stall-color/Design Journey update. Local checks and their limits are recorded in GROW-PLANNER-RELEASE.md; live checks remain required.
