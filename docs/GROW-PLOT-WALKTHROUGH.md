> September 17 update: this document describes the archived sample-data prototype. For the saved live planner and Q feedback workflow, use GROW-PLANNER-RELEASE.md.

# Grow plot planner — first walkthrough

This prototype uses sample records. Nothing is sent to the live farm database. Save layout preview retains changes only while this preview stays open; refreshing resets them.

1. Open `Grow-Plot-Planner-Preview.html` in a browser. The sample South plot starts at 4 × 4 feet within a 6 × 6-foot preview canvas. Each square represents one square foot.
2. Expand **Create a rectangle** to set width and length. Existing crops must fit inside the new shape.
3. Choose **Edit plot shape**. Tap an empty square to add it to the plot, or tap an unoccupied plot square to remove it. Move crops before removing occupied squares. Choose **Select** when finished.
4. Select a crop from **Crop layers** or tap its square. A square labeled **A+B** contains two crops; choose the named layer you want. **Hide/Show** helps reveal a crop underneath another one.
5. Choose **Move crop**, then tap its new top-left square. The complete footprint must fit inside the plot. If it overlaps another crop, explicitly confirm that the overlap is intentional. Moving a crop does not change planting dates.
6. Choose **Add crop**. Enter crop type, footprint width and length, and planting date. Expand optional details for notes, soil, expected harvest date, and color. Choose **Choose placement**, then tap its top-left square on the plot.
7. Use **Selected layer color** to adjust the selected crop's color. Names and letter identifiers remain available so color is not the only way to distinguish crops.
8. Use **Undo** to reverse a layout change. **Save layout preview** demonstrates the intended action but does not persist real records.

## Q's review questions

- Can you create a plot shape and place a crop without assistance?
- Is selecting an overlapping crop clear on your phone?
- Are controls large enough, and can you scroll without accidentally changing a layout?
- Is it clear which changes are unsaved, which crop is selected, and what a square represents?
- Does “crop width and length” clearly mean planted footprint rather than plant count or plant spacing?
- Which step needs less explanation or a better label?

## Walkthrough to include in the implemented feature

Offer a short first-use sequence: Shape your plot → Add a crop → Select and move → Review and save. Include Skip and a persistent Help / Show walkthrough action. Highlight one control at a time, support keyboard focus and dismissal, and keep explanations near the relevant control. Do not automatically replay the walkthrough every visit.

## Release preparation status

The prototype has passed local checks for shape editing, overlap selection, move confirmation, adding crops, Undo, and layouts at 320/390/1024px. These are prototype checks, not production acceptance.

Before releasing saved geometry: separate physical plots from dated crop plantings, preserve existing harvest links and correction history, persist versioned geometry, implement durable save/error recovery and unsaved-change handling, verify membership/Owner-switch/T2 permissions, implement the walkthrough, and test real phone/tablet interactions. Do not deploy the prototype as though it saves real farm records.

The Design Journey URL update and consistent stall-card colors are separate local changes that can be released without waiting for the geometry feature.
