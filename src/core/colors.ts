/** Condition colors, shared by the plate grid, chart, conditions panel and Excel export. */
export const PALETTE = [
  '#a8c8f0', '#f7b89a', '#9fdcc0', '#f5d78a', '#f2b3cd', '#b9dc8f',
  '#c4bdf2', '#f4a7a6', '#9ed6e6', '#e3c39d', '#d3b6e0', '#c9d1d9',
];

/**
 * Color of a condition given the first-seen order of condition names (`colorKeys`).
 * Colors follow the condition, not its current position, so reordering never repaints.
 */
export function colorFor(colorKeys: readonly string[], condition: string): string {
  const i = colorKeys.indexOf(condition);
  return PALETTE[(i < 0 ? colorKeys.length : i) % PALETTE.length];
}
