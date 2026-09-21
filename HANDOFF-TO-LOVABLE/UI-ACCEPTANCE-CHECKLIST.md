# UI acceptance checklist

## Desktop navigation

- [ ] Only Find food, Community Board, and Farmer tools occupy the primary expanded navigation.
- [ ] More contains Our mission, Design Journey, and Admin.
- [ ] Every existing destination still works.
- [ ] More opens by pointer and keyboard, closes with Escape and outside interaction, and restores focus appropriately.
- [ ] Sign out does not visually compete with discovery navigation.
- [ ] At mobile widths, the existing burger remains obvious and usable.

## Filter response

- [ ] Selecting a nutrition objective still reorders cards.
- [ ] Map markers still update to matching farms.
- [ ] The selected objective and matching produce remain easy to understand.
- [ ] The general-education/medical-advice disclaimer remains visible.
- [ ] Root Route remains available when three or more farms match.
- [ ] Supporting information uses less vertical space than the current production layout.
- [ ] Clearing the objective returns the default experience.

## Map and card numbering

- [ ] Map copy clearly says the numbers match farm cards.
- [ ] Each displayed farm card has its corresponding result number.
- [ ] Numbers update after search, region, availability, or nutrition sorting changes.
- [ ] Selected card and marker share a visible selected state.
- [ ] Selection is understandable without color alone.
- [ ] T1/T2 labels are not confused with result numbers.

## Regression check

- [ ] Fifteen farms load from the configured Supabase project.
- [ ] Predictive search finds public coming-soon produce.
- [ ] Coming-soon items retain pale-gray dashed styling.
- [ ] Selling now, In stock, Volunteer, Region, and All filters work.
- [ ] Cards expand and close correctly.
- [ ] Community Board and saved interest still work.
- [ ] Farmer Tools, Admin, Mission, and Design Journey remain reachable.
- [ ] No horizontal scrolling or overlapping controls at 360px, 768px, 1024px, and 1440px.

