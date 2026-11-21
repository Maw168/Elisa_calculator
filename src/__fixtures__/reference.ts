import type { Assignment, Plate } from '../core/types';
import { COLS, ROWS, wellId } from '../core/types';
import { loadReferenceWorkbook } from './fixture';

/** Builds a plate from the reference concentration block (header at A28). */
export function referencePlate(): Plate {
  const ws = loadReferenceWorkbook().Sheets['Magellan Sheet 1'];
  return ROWS.map((_, r) =>
    COLS.map((_, c) => {
      const addr = `${String.fromCharCode(66 + c)}${29 + r}`;
      const v = ws[addr]?.v;
      return typeof v === 'number' ? { value: v, text: String(v) } : { value: null, text: v == null ? '' : String(v) };
    }),
  );
}

export function assignRange(
  assignment: Assignment,
  row: number,
  fromCol: number,
  toCol: number,
  condition: string,
  bio: number,
): void {
  for (let c = fromCol; c <= toCol; c++) assignment[wellId(row, c - 1)] = { condition, bio };
}

/** The user's layout for the reference plate (8 conditions x 3 bio reps x 3 technical reps). */
export function referenceAssignment(): Assignment {
  const a: Assignment = {};
  const blocks: [number, string][] = [
    [3, 'E+s+p api'],
    [6, 'E+R+P api'],
    [9, 'E+P api'],
  ];
  const basl: [number, string][] = [
    [3, 'E+S+P basl'],
    [6, 'E+R+P basl'],
    [9, 'E+p basl'],
  ];
  for (let bio = 1; bio <= 3; bio++) {
    for (const [col, name] of blocks) assignRange(a, bio - 1, col, col + 2, name, bio);
    for (const [col, name] of basl) assignRange(a, bio + 2, col, col + 2, name, bio);
    assignRange(a, 6, 3 * bio, 3 * bio + 2, 'Pao1 api', bio);
    assignRange(a, 7, 3 * bio, 3 * bio + 2, 'Pao1 basl', bio);
  }
  return a;
}

/** Columns D..K of the reference result block and the condition each holds. */
export const REFERENCE_RESULT_COLUMNS: [string, string][] = [
  ['D', 'E+s+p api'],
  ['E', 'E+R+P api'],
  ['F', 'E+S+P basl'],
  ['G', 'E+R+P basl'],
  ['H', 'E+P api'],
  ['I', 'Pao1 api'],
  ['J', 'E+p basl'],
  ['K', 'Pao1 basl'],
];
