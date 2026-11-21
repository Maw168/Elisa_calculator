import type { Assignment, WellId } from './types';
import { wellId } from './types';

/** All wells in the rectangle spanned by two wells (inclusive). */
export function rectWells(a: { row: number; col: number }, b: { row: number; col: number }): WellId[] {
  const out: WellId[] = [];
  for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++) {
    for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) out.push(wellId(r, c));
  }
  return out;
}

/** Assigns (or re-assigns) wells to a condition and biological replicate. */
export function assignWells(assignment: Assignment, wells: WellId[], condition: string, bio: number): Assignment {
  const next = { ...assignment };
  for (const w of wells) next[w] = { condition, bio };
  return next;
}

export function clearWells(assignment: Assignment, wells: WellId[]): Assignment {
  const next = { ...assignment };
  for (const w of wells) delete next[w];
  return next;
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Groups of distinct condition names that are equal ignoring case and repeated whitespace. */
export function findNearDuplicates(names: string[]): string[][] {
  const byKey = new Map<string, string[]>();
  for (const n of new Set(names)) {
    const key = normalizeName(n);
    byKey.set(key, [...(byKey.get(key) ?? []), n]);
  }
  return [...byKey.values()].filter((g) => g.length > 1);
}

/** Renames every well of condition `from` to `to`, keeping biological replicate numbers. */
export function mergeCondition(assignment: Assignment, from: string, to: string): Assignment {
  const next: Assignment = {};
  for (const [w, a] of Object.entries(assignment)) {
    next[w] = a.condition === from ? { condition: to, bio: a.bio } : a;
  }
  return next;
}

/** Condition names present in an assignment, in plate order. */
export function conditionNames(assignment: Assignment): string[] {
  return [...new Set(Object.values(assignment).map((a) => a.condition))];
}

/**
 * Keeps `order` in sync with the assignment: drops conditions no longer assigned and
 * appends newly assigned ones (in the order given by `newlyAssigned`, then plate order).
 */
export function reconcileOrder(order: string[], assignment: Assignment, newlyAssigned: string[] = []): string[] {
  const present = new Set(conditionNames(assignment));
  const next = order.filter((c) => present.has(c));
  for (const c of [...newlyAssigned, ...conditionNames(assignment)]) {
    if (present.has(c) && !next.includes(c)) next.push(c);
  }
  return next;
}

/** Moves a condition by `delta` positions, clamped to the list bounds. */
export function moveCondition(order: string[], name: string, delta: number): string[] {
  const i = order.indexOf(name);
  if (i < 0) return order;
  const j = Math.max(0, Math.min(order.length - 1, i + delta));
  const next = [...order];
  next.splice(i, 1);
  next.splice(j, 0, name);
  return next;
}
