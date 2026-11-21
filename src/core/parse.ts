import type { Cell, Plate } from './types';
import { COL_COUNT, ROW_COUNT, ROWS } from './types';

/** Parses one cell's text. Non-numeric text (e.g. "NoCalc") becomes a missing value. */
export function parseCell(raw: unknown): Cell {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? { value: raw, text: String(raw) } : { value: null, text: String(raw) };
  }
  const text = raw == null ? '' : String(raw).trim();
  if (text === '') return { value: null, text: '' };
  // Accept a decimal comma ("372,19") as produced by some Excel locales.
  const normalized = /^-?\d+,\d+$/.test(text) ? text.replace(',', '.') : text;
  const n = Number(normalized);
  return { value: Number.isFinite(n) ? n : null, text };
}

export type PasteResult =
  | { ok: true; plate: Plate }
  | { ok: false; error: string; rows: number; cols: number };

function isHeaderRow(cells: string[]): boolean {
  const first = cells[0]?.trim();
  if (first === '<>') return true;
  // A row "1 2 3 ... 12", optionally preceded by an empty cell.
  const nums = cells.map((c) => c.trim()).filter((c) => c !== '');
  return nums.length === COL_COUNT && nums.every((c, i) => c === String(i + 1));
}

/** Parses tab-separated text copied from Excel into an 8 x 12 plate. */
export function parsePaste(text: string): PasteResult {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  while (lines.length && lines[0].trim() === '') lines.shift();
  let rows = lines.map((l) => l.split('\t'));

  if (rows.length && isHeaderRow(rows[0])) rows = rows.slice(1);

  const hasRowLetters =
    rows.length === ROW_COUNT && rows.every((r, i) => r[0]?.trim().toUpperCase() === ROWS[i]);
  if (hasRowLetters) rows = rows.map((r) => r.slice(1));

  // Drop trailing empty cells beyond 12 columns (Excel may add them).
  rows = rows.map((r) => {
    const out = [...r];
    while (out.length > COL_COUNT && out[out.length - 1].trim() === '') out.pop();
    return out;
  });

  const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const badRow = rows.some((r) => r.length !== COL_COUNT);
  if (rows.length !== ROW_COUNT || badRow) {
    return {
      ok: false,
      error: `Expected 8 rows x 12 columns, found ${rows.length} rows x ${cols} columns.`,
      rows: rows.length,
      cols,
    };
  }
  return { ok: true, plate: rows.map((r) => r.map(parseCell)) };
}
