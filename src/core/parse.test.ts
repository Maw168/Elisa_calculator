import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseCell, parsePaste } from './parse';
import { defaultBlockIndex, findPlateBlocks } from './xlsxBlocks';
import { loadReferenceWorkbook } from '../__fixtures__/fixture';

/** Builds the tab-separated text Excel produces when copying A28:M36 of the reference sheet. */
function referenceClipboard(): string {
  const ws = loadReferenceWorkbook().Sheets['Magellan Sheet 1'];
  const lines: string[] = [];
  for (let r = 28; r <= 36; r++) {
    const cells: string[] = [];
    for (let c = 0; c <= 12; c++) {
      const v = ws[XLSX.utils.encode_cell({ r: r - 1, c })]?.v;
      cells.push(v == null ? '' : String(v));
    }
    lines.push(cells.join('\t'));
  }
  return lines.join('\r\n') + '\r\n';
}

describe('parsePaste', () => {
  it('Paste block with headers from Excel', () => {
    const r = parsePaste(referenceClipboard());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plate[0][2].value).toBe(372.19);
    expect(r.plate[7][11].value).toBe(145.32);
  });

  it('Paste block without headers', () => {
    const text = Array.from({ length: 8 }, (_, r) =>
      Array.from({ length: 12 }, (_, c) => String(r * 100 + c)).join('\t'),
    ).join('\n');
    const r = parsePaste(text);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plate[0].map((c) => c.value)).toEqual(Array.from({ length: 12 }, (_, c) => c));
    expect(r.plate.map((row) => row[0].value)).toEqual([0, 100, 200, 300, 400, 500, 600, 700]);
  });

  it('Paste with the wrong shape reports counts', () => {
    const r = parsePaste('1\t2\t3\n4\t5\t6');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.rows).toBe(2);
    expect(r.cols).toBe(3);
    expect(r.error).toContain('2 rows x 3 columns');
  });

  it('NoCalc cell is missing but keeps its text', () => {
    expect(parseCell('NoCalc')).toEqual({ value: null, text: 'NoCalc' });
    const r = parsePaste(referenceClipboard());
    if (!r.ok) throw new Error(r.error);
    expect(r.plate[7][0]).toEqual({ value: null, text: 'NoCalc' });
    expect(r.plate[0][1]).toEqual({ value: null, text: '' });
  });

  it('accepts decimal commas', () => {
    expect(parseCell('372,19').value).toBe(372.19);
  });
});

describe('findPlateBlocks', () => {
  it('finds the concentration block at row 28 identical to the pasted range', () => {
    const blocks = findPlateBlocks(loadReferenceWorkbook());
    expect(blocks.map((b) => b.headerRow)).toEqual([1, 10, 19, 28, 37]);
    const block = blocks.find((b) => b.headerRow === 28)!;
    const pasted = parsePaste(referenceClipboard());
    if (!pasted.ok) throw new Error(pasted.error);
    expect(block.plate).toEqual(pasted.plate);
    expect(blocks[defaultBlockIndex(blocks)].headerRow).toBe(28);
  });

  it('returns no blocks for a workbook without a plate', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['hello', 1, 2]]), 'S');
    expect(findPlateBlocks(wb)).toEqual([]);
  });
});
