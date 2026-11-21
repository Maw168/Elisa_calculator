import * as XLSX from 'xlsx';
import type { Plate } from './types';
import { COL_COUNT, ROW_COUNT, ROWS } from './types';
import { parseCell } from './parse';

export interface PlateBlock {
  sheet: string;
  /** Address of the "<>" header cell, e.g. "A28". */
  headerAddress: string;
  /** 1-based sheet row of the header. */
  headerRow: number;
  plate: Plate;
  /** Number of numeric wells in the block. */
  numericCount: number;
}

function cellValue(ws: XLSX.WorkSheet, r: number, c: number): unknown {
  return ws[XLSX.utils.encode_cell({ r, c })]?.v;
}

/** Finds 8 x 12 plate blocks: a "<>" cell with 1..12 to its right and A..H below it. */
export function findPlateBlocks(wb: XLSX.WorkBook): PlateBlock[] {
  const blocks: PlateBlock[] = [];
  for (const sheet of wb.SheetNames) {
    const ws = wb.Sheets[sheet];
    if (!ws['!ref']) continue;
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        if (String(cellValue(ws, r, c) ?? '').trim() !== '<>') continue;
        const colsOk = Array.from({ length: COL_COUNT }, (_, i) => String(cellValue(ws, r, c + 1 + i) ?? '').trim()).every(
          (v, i) => v === String(i + 1),
        );
        const rowsOk = ROWS.every((letter, i) => String(cellValue(ws, r + 1 + i, c) ?? '').trim().toUpperCase() === letter);
        if (!colsOk || !rowsOk) continue;
        const plate: Plate = Array.from({ length: ROW_COUNT }, (_, i) =>
          Array.from({ length: COL_COUNT }, (_, j) => parseCell(cellValue(ws, r + 1 + i, c + 1 + j))),
        );
        blocks.push({
          sheet,
          headerAddress: XLSX.utils.encode_cell({ r, c }),
          headerRow: r + 1,
          plate,
          numericCount: plate.flat().filter((x) => x.value !== null).length,
        });
      }
    }
  }
  return blocks;
}

/** Index of the block to preselect: the last block where at least half the wells are numeric. */
export function defaultBlockIndex(blocks: PlateBlock[]): number {
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].numericCount >= (ROW_COUNT * COL_COUNT) / 2) return i;
  }
  return blocks.length - 1;
}

export function readWorkbook(data: ArrayBuffer): XLSX.WorkBook {
  return XLSX.read(data, { type: 'array' });
}
