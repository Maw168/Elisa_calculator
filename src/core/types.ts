export const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;
export const COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export const ROW_COUNT = ROWS.length;
export const COL_COUNT = COLS.length;

/** Well id in plate coordinates, e.g. "A1" .. "H12". */
export type WellId = string;

/** A plate cell: numeric value, or null when blank / non-numeric (e.g. "NoCalc"). */
export interface Cell {
  value: number | null;
  /** Original text as loaded, kept for display. */
  text: string;
}

/** 8 rows x 12 columns, indexed [row][col] with 0-based indices. */
export type Plate = Cell[][];

export interface WellAssignment {
  condition: string;
  /** Biological replicate number, positive integer. */
  bio: number;
}

export type Assignment = Record<WellId, WellAssignment>;

export type Unit = 'pg/ml' | 'ng/ml' | 'ug/ml';
export const UNITS: Unit[] = ['pg/ml', 'ng/ml', 'ug/ml'];

export type ErrorBar = 'SD' | 'SEM';

export interface Settings {
  dilution: number;
  inputUnit: Unit;
  outputUnit: Unit;
  errorBar: ErrorBar;
}

export const DEFAULT_SETTINGS: Settings = {
  dilution: 1,
  inputUnit: 'pg/ml',
  outputUnit: 'pg/ml',
  errorBar: 'SD',
};

export function wellId(row: number, col: number): WellId {
  return `${ROWS[row]}${col + 1}`;
}

export function parseWellId(id: WellId): { row: number; col: number } {
  const row = ROWS.indexOf(id[0] as (typeof ROWS)[number]);
  const col = Number(id.slice(1)) - 1;
  if (row < 0 || !Number.isInteger(col) || col < 0 || col >= COL_COUNT) {
    throw new Error(`Invalid well id: ${id}`);
  }
  return { row, col };
}

export function emptyPlate(): Plate {
  return ROWS.map(() => COLS.map(() => ({ value: null, text: '' })));
}
