/** Whole-cell geometry; a cell is one square foot or meter, never a plant count.
 * SQL independently validates this contract. Existing crop/harvest IDs stay intact.
 */
export const GRID = 12;
export type CropLayer = { plotId: string; x: number; y: number; width: number; height: number; color: string };
export type Layout = { unit: "ft" | "m"; cells: number[]; layers: CropLayer[] };
export const colors = ["#386b50", "#ad653e", "#516c9c", "#93629c", "#94761e"];
export function rectangle(width: number, height: number, x = 0, y = 0): number[] {
  return Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => (row + y) * GRID + col + x)).flat();
}
export function footprint(layer: CropLayer) { return rectangle(layer.width, layer.height, layer.x, layer.y); }
export function fits(layout: Layout, layer: CropLayer): boolean {
  return [layer.x, layer.y, layer.width, layer.height].every(Number.isInteger) && layer.x >= 0 && layer.y >= 0 && layer.width > 0 && layer.height > 0 && layer.x + layer.width <= GRID && layer.y + layer.height <= GRID && footprint(layer).every(cell => layout.cells.includes(cell));
}
export function overlaps(layout: Layout, layer: CropLayer): CropLayer[] {
  const cells = new Set(footprint(layer));
  return layout.layers.filter(other => other.plotId !== layer.plotId && footprint(other).some(cell => cells.has(cell)));
}
export function newLayout(): Layout { return { unit: "ft", cells: rectangle(4, 4), layers: [] }; }
