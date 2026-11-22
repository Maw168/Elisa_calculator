import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import {
  assignWells,
  clearWells,
  findNearDuplicates,
  mergeCondition,
  mergeDilutions,
  moveCondition,
  rectWells,
  reconcileOrder,
} from './assignment';
import { computeResults } from './calc';
import { argb, buildWorkbook, hasExportableResults, prismText } from './export';
import { colorFor } from './colors';
import {
  loadTemplates,
  parseTemplates,
  saveTemplates,
  STORAGE_KEY,
  templateSettings,
  upsertTemplate,
  type StorageLike,
  type Template,
} from './templates';
import { DEFAULT_SETTINGS, emptyPlate, type Assignment } from './types';
import { referenceAssignment, referencePlate } from '../__fixtures__/reference';

const refSettings = { ...DEFAULT_SETTINGS, dilution: 500, outputUnit: 'ng/ml' as const };

describe('assignment', () => {
  it('rectangle selection A3..A5', () => {
    expect(rectWells({ row: 0, col: 2 }, { row: 0, col: 4 })).toEqual(['A3', 'A4', 'A5']);
  });

  it('re-assigning replaces the old assignment and clear removes it', () => {
    let a = assignWells({}, ['A3', 'A4'], 'x', 1);
    a = assignWells(a, ['A4'], 'y', 2);
    expect(a).toEqual({ A3: { condition: 'x', bio: 1 }, A4: { condition: 'y', bio: 2 } });
    expect(clearWells(a, ['A3'])).toEqual({ A4: { condition: 'y', bio: 2 } });
  });

  it('Case difference is detected', () => {
    expect(findNearDuplicates(['E+s+p api', 'E+S+P api', 'E+P api', 'e+p  api'])).toEqual([
      ['E+s+p api', 'E+S+P api'],
      ['E+P api', 'e+p  api'],
    ]);
    expect(findNearDuplicates(['a', 'b'])).toEqual([]);
  });

  it('User merges names: bio numbers kept, nothing else changes', () => {
    const a: Assignment = {
      A3: { condition: 'E+S+P api', bio: 2 },
      A4: { condition: 'E+s+p api', bio: 1 },
      A5: { condition: 'other', bio: 3 },
    };
    expect(mergeCondition(a, 'E+S+P api', 'E+s+p api')).toEqual({
      A3: { condition: 'E+s+p api', bio: 2 },
      A4: { condition: 'E+s+p api', bio: 1 },
      A5: { condition: 'other', bio: 3 },
    });
  });
});

describe('merging dilutions', () => {
  it('kept name keeps its own dilution and reports a conflict', () => {
    expect(mergeDilutions({ 'E+s+p api': 500, 'E+S+P api': 250 }, 'E+S+P api', 'E+s+p api')).toEqual({
      dilutions: { 'E+s+p api': 500 },
      conflict: { kept: 500, discarded: 250 },
    });
  });

  it('kept name inherits the merged dilution', () => {
    expect(mergeDilutions({ 'E+S+P api': 250, x: 3 }, 'E+S+P api', 'E+s+p api')).toEqual({
      dilutions: { x: 3, 'E+s+p api': 250 },
      conflict: null,
    });
  });

  it('equal dilutions are not a conflict', () => {
    expect(mergeDilutions({ a: 5, b: 5 }, 'a', 'b').conflict).toBeNull();
    expect(mergeDilutions({}, 'a', 'b')).toEqual({ dilutions: {}, conflict: null });
  });
});

describe('condition order', () => {
  it('appends newly assigned and drops removed conditions', () => {
    const a: Assignment = { A1: { condition: 'b', bio: 1 }, A2: { condition: 'c', bio: 1 } };
    expect(reconcileOrder(['a', 'b'], a, ['c'])).toEqual(['b', 'c']);
  });

  it('Reorder conditions: move Pao1 api first', () => {
    const order = ['E+s+p api', 'E+R+P api', 'Pao1 api'];
    expect(moveCondition(order, 'Pao1 api', -10)).toEqual(['Pao1 api', 'E+s+p api', 'E+R+P api']);
    expect(moveCondition(order, 'E+s+p api', 1)).toEqual(['E+R+P api', 'E+s+p api', 'Pao1 api']);
  });
});

describe('exports', () => {
  const plate = referencePlate();
  const order = ['E+s+p api', 'E+R+P api', 'E+P api', 'Pao1 api', 'E+S+P basl', 'E+R+P basl', 'E+p basl', 'Pao1 basl'];

  it('Prism text for the reference plate', () => {
    const r = computeResults(plate, referenceAssignment(), new Set(), refSettings, order);
    const lines = prismText(r).trimEnd().split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe(order.join('\t'));
    expect(lines[1].split('\t')[0]).toBe('182.9367');
    expect(lines[3].split('\t')[3]).toBe('238.8967');
  });

  it('Prism text leaves gaps empty', () => {
    const a: Assignment = { A3: { condition: 'x', bio: 1 }, B3: { condition: 'x', bio: 3 }, C3: { condition: 'y', bio: 2 } };
    const lines = prismText(computeResults(plate, a, new Set(), DEFAULT_SETTINGS)).split('\n').slice(0, -1);
    expect(lines).toEqual(['x\ty', '372.1900\t', '\t392.2600', '394.8000\t']);
  });

  it('nothing to export on an empty plate', () => {
    expect(hasExportableResults(computeResults(emptyPlate(), {}, new Set(), DEFAULT_SETTINGS))).toBe(false);
  });

  const colorOf = (c: string) => colorFor(order, c);
  async function exportRef(settings = refSettings, excluded = new Set(['G6'])) {
    const a = referenceAssignment();
    const r = computeResults(plate, a, excluded, settings, order);
    return buildWorkbook({ plate, assignment: a, excluded, settings, results: r, colorOf, source: 'ref.xlsx', exportedAt: new Date(2026, 10, 22, 9, 5) });
  }

  it('Excel: excluded wells are traceable and settings recorded', async () => {
    const settings = { ...refSettings, dilutions: { 'Pao1 api': 100 } };
    const back = XLSX.read(await exportRef(settings), { type: 'array' });
    expect(back.SheetNames).toEqual(['Layout', 'Plate', 'Replicates', 'Results']);

    const plateRows = XLSX.utils.sheet_to_json<unknown[]>(back.Sheets.Plate, { header: 1 });
    const g6 = plateRows.find((row) => row[0] === 'G6')!;
    expect(g6).toEqual(['G6', 189.97, '189.97', 'Pao1 api', 2, 'yes']);
    expect(plateRows.some((row) => row.includes('Pao1 api | bio 2 [EXCLUDED]'))).toBe(true);

    const reps = XLSX.utils.sheet_to_json<Record<string, unknown>>(back.Sheets.Replicates);
    const grp = reps.find((x) => x.Condition === 'Pao1 api' && x.Bio === 2)!;
    expect(grp['Excluded wells']).toBe('G6');
    expect(grp['Dilution (1:x)']).toBe(100);
    expect(grp['Final value (ng/ml)']).toBeCloseTo(183.08 / 5, 2);
    expect(reps.find((x) => x.Condition === 'E+s+p api')!['Dilution (1:x)']).toBe(500);

    const res = XLSX.utils.sheet_to_json<unknown[]>(back.Sheets.Results, { header: 1, blankrows: true });
    expect(res[0]).toEqual(['Default dilution (1:x)', 500]);
    expect(res[2]).toEqual(['Output unit', 'ng/ml']);
    expect(res[4]).toEqual(['Values (ng/ml)', ...order]);
    expect(res[5]).toEqual(['Dilution (1:x)', ...order.map((c) => (c === 'Pao1 api' ? 100 : 500))]);
    expect(res[6][1]).toBeCloseTo(182.93666666666664, 10);
  });

  it('Excel: colored layout sheet with legend', async () => {
    const settings = { ...refSettings, dilutions: { 'Pao1 api': 100 } };
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await exportRef(settings));
    const ws = wb.getWorksheet('Layout')!;
    expect(wb.worksheets[0].name).toBe('Layout');
    // Grid starts at row 8; column B is plate column 1.
    const a3 = ws.getCell('D8');
    expect(a3.value).toBe('E+s+p api\nbio 1\n372.19');
    expect((a3.fill as ExcelJS.FillPattern).fgColor?.argb).toBe(argb(colorOf('E+s+p api')));
    const g6 = ws.getCell('G14');
    expect(String(g6.value)).toContain('EXCLUDED');
    expect(g6.font?.strike).toBe(true);
    const a1 = ws.getCell('B8');
    expect(a1.value).toBe('565.46');
    expect((a1.fill as ExcelJS.FillPattern | undefined)?.pattern ?? 'none').toBe('none');
    expect(ws.getCell('C2').value).toBe('ref.xlsx');
    expect(ws.getCell('C3').value).toBe('2026-11-22 09:05');
    expect(ws.getCell('C5').value).toBe('1:500');

    const legend: Record<string, unknown[]> = {};
    ws.eachRow((row, n) => {
      if (n > 17) legend[String(row.getCell(2).value)] = [row.getCell(3).value, row.getCell(4).value, (row.getCell(1).fill as ExcelJS.FillPattern | undefined)?.fgColor?.argb];
    });
    expect(legend['Pao1 api']).toEqual(['1:100', '1, 2, 3', argb(colorOf('Pao1 api'))]);
    expect(legend['E+s+p api']).toEqual(['1:500', '1, 2, 3', argb(colorOf('E+s+p api'))]);
  });

  it('Prism copy carries no dilution', () => {
    const settings = { ...refSettings, dilutions: { 'Pao1 api': 100 } };
    const r = computeResults(plate, referenceAssignment(), new Set(), settings, order);
    const text = prismText(r);
    expect(text).not.toMatch(/1:|dilution/i);
    expect(text.trimEnd().split('\n')).toHaveLength(4);
  });
});

describe('templates', () => {
  function memoryStorage(): StorageLike & { data: Map<string, string> } {
    const data = new Map<string, string>();
    return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
  }
  const t: Template = {
    name: 'ETI layout',
    assignment: referenceAssignment(),
    settings: refSettings,
    conditionOrder: ['Pao1 api'],
  };

  it('save and load round-trip', () => {
    const s = memoryStorage();
    expect(saveTemplates(s, [t])).toBe(true);
    expect(s.data.has(STORAGE_KEY)).toBe(true);
    expect(loadTemplates(s)).toEqual({ templates: [t], available: true });
  });

  it('file export/import round-trip', () => {
    expect(parseTemplates(JSON.parse(JSON.stringify([t])))).toEqual([t]);
    expect(() => parseTemplates({ name: 'x', assignment: { Z9: { condition: 'a', bio: 1 } } })).toThrow();
  });

  it('upsert replaces by name', () => {
    const t2 = { ...t, conditionOrder: [] };
    expect(upsertTemplate([t], t2)).toEqual([t2]);
  });

  it('Template from before per-condition dilutions', () => {
    const old = { name: 'old', assignment: { A1: { condition: 'a', bio: 1 } }, settings: { dilution: 500, inputUnit: 'pg/ml', outputUnit: 'ng/ml' } };
    const [loaded] = parseTemplates(old);
    expect(loaded.settings.dilution).toBe(500);
    expect(loaded.settings.dilutions).toEqual({});
  });

  it('invalid per-condition dilutions are dropped', () => {
    const [loaded] = parseTemplates({
      name: 'x',
      assignment: {},
      settings: { dilution: 1, dilutions: { a: 100, b: 0, c: -1, d: 'x', e: null } },
    });
    expect(loaded.settings.dilutions).toEqual({ a: 100 });
  });

  it('Template keeps per-condition dilutions, dormant ones are not saved', () => {
    const settings = { ...refSettings, dilutions: { 'Pao1 api': 100, gone: 7 } };
    const saved = templateSettings(settings, referenceAssignment());
    expect(saved.dilutions).toEqual({ 'Pao1 api': 100 });
    expect(saved.dilution).toBe(500);
    const [loaded] = parseTemplates(JSON.parse(JSON.stringify({ ...t, settings: saved })));
    expect(loaded.settings.dilutions).toEqual({ 'Pao1 api': 100 });
  });

  it('Browser storage unavailable', () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadTemplates(throwing)).toEqual({ templates: [], available: false });
    expect(saveTemplates(throwing, [t])).toBe(false);
    expect(loadTemplates(null).available).toBe(false);
  });
});
