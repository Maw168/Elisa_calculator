import { describe, expect, it } from 'vitest';
import { computeResults, formatDilution, groupWells, parseDilution, technicalMean, unitFactor } from './calc';
import { DEFAULT_SETTINGS, emptyPlate, type Assignment, type Plate } from './types';
import { loadReferenceWorkbook } from '../__fixtures__/fixture';
import {
  assignRange,
  REFERENCE_RESULT_COLUMNS,
  referenceAssignment,
  referencePlate,
} from '../__fixtures__/reference';

const plate: Plate = referencePlate();
const none = new Set<string>();
const refSettings = { ...DEFAULT_SETTINGS, dilution: 500, outputUnit: 'ng/ml' as const };

describe('technical replicates', () => {
  it('groups wells by condition and bio regardless of position', () => {
    const a: Assignment = {};
    assignRange(a, 6, 3, 5, 'Pao1 api', 1);
    assignRange(a, 6, 6, 8, 'Pao1 api', 2);
    assignRange(a, 6, 9, 11, 'Pao1 api', 3);
    const groups = groupWells(a);
    expect(groups).toHaveLength(3);
    expect(groups.every((g) => g.wells.length === 3)).toBe(true);
    expect(groups.find((g) => g.bio === 2)!.wells).toEqual(['G6', 'G7', 'G8']);
  });

  it('allows two technical replicates', () => {
    const a: Assignment = { A3: { condition: 'x', bio: 1 }, A4: { condition: 'x', bio: 1 } };
    expect(groupWells(a)).toEqual([{ condition: 'x', bio: 1, wells: ['A3', 'A4'] }]);
  });

  it('Three valid wells: 365.87', () => {
    expect(technicalMean(plate, ['A3', 'A4', 'A5'], none)).toBeCloseTo(365.87, 2);
  });

  it('One excluded well: 366.16', () => {
    expect(technicalMean(plate, ['G6', 'G7', 'G8'], new Set(['G6']))).toBeCloseTo(366.16, 2);
  });

  it('All wells missing: empty, not zero', () => {
    const p = emptyPlate();
    p[0][0] = { value: null, text: 'NoCalc' };
    p[0][1] = { value: 10, text: '10' };
    expect(technicalMean(p, ['A1', 'A2'], new Set(['A2']))).toBeNull();
    const a: Assignment = { A1: { condition: 'x', bio: 1 }, A2: { condition: 'x', bio: 1 } };
    const r = computeResults(p, a, new Set(['A2']), DEFAULT_SETTINGS);
    expect(r.conditions[0].bioValues.get(1)).toBeNull();
    expect(r.conditions[0].n).toBe(0);
  });
});

describe('dilution and units', () => {
  it('unit factors', () => {
    expect(unitFactor('pg/ml', 'ng/ml')).toBe(1 / 1000);
    expect(unitFactor('ug/ml', 'pg/ml')).toBe(1e6);
    expect(unitFactor('ng/ml', 'ng/ml')).toBe(1);
  });

  it('Reproduce the reference workbook: 182.94 ng/ml', () => {
    const a: Assignment = {};
    assignRange(a, 0, 3, 5, 'E+s+p api', 1);
    const r = computeResults(plate, a, none, refSettings);
    expect(r.groups[0].value).toBeCloseTo(182.94, 2);
  });

  it('Invalid dilution is rejected', () => {
    expect(parseDilution('0')).toBeNull();
    expect(parseDilution('-5')).toBeNull();
    expect(parseDilution('abc')).toBeNull();
    expect(parseDilution('')).toBeNull();
    expect(parseDilution('500')).toBe(500);
    expect(parseDilution('2.5')).toBe(2.5);
    expect(parseDilution('1:0')).toBeNull();
    expect(parseDilution('1:-5')).toBeNull();
    expect(parseDilution('1:abc')).toBeNull();
    expect(parseDilution('1:')).toBeNull();
    expect(parseDilution('2:500')).toBeNull();
    expect(parseDilution('1:2:3')).toBeNull();
  });

  it('Dilution notation: 1:x and bare x', () => {
    expect(parseDilution('1:500')).toBe(500);
    expect(parseDilution(' 1 : 500 ')).toBe(500);
    expect(parseDilution('500')).toBe(500);
    expect(formatDilution(500)).toBe('1:500');
    expect(formatDilution(2.5)).toBe('1:2.5');
  });

  it('Conditions with different dilutions', () => {
    const a: Assignment = {};
    assignRange(a, 0, 3, 5, 'E+s+p api', 1);
    assignRange(a, 6, 3, 5, 'Pao1 api', 1);
    const settings = { ...DEFAULT_SETTINGS, dilution: 500, dilutions: { 'Pao1 api': 100 } };
    const r = computeResults(plate, a, none, settings);
    const e = r.groups.find((g) => g.condition === 'E+s+p api')!;
    const p = r.groups.find((g) => g.condition === 'Pao1 api')!;
    expect(e.dilution).toBe(500);
    expect(e.value).toBeCloseTo(e.technicalMean! * 500, 9);
    expect(p.dilution).toBe(100);
    expect(p.value).toBeCloseTo(p.technicalMean! * 100, 9);
  });

  it('Condition falls back to the default', () => {
    const a: Assignment = {};
    assignRange(a, 0, 3, 5, 'E+s+p api', 1);
    const settings = { ...DEFAULT_SETTINGS, dilution: 200, dilutions: { other: 7 } };
    const g = computeResults(plate, a, none, settings).groups[0];
    expect(g.value).toBeCloseTo(g.technicalMean! * 200, 9);
  });
});

describe('summary statistics', () => {
  it('Three biological replicates: 185.58 / 4.32 / 2.49', () => {
    const a: Assignment = {};
    for (let bio = 1; bio <= 3; bio++) assignRange(a, bio - 1, 3, 5, 'E+s+p api', bio);
    const c = computeResults(plate, a, none, refSettings).conditions[0];
    expect([...c.bioValues.values()].map((v) => Number(v!.toFixed(2)))).toEqual([182.94, 183.24, 190.56]);
    expect(c.n).toBe(3);
    expect(c.mean).toBeCloseTo(185.58, 2);
    expect(c.sd).toBeCloseTo(4.32, 2);
    expect(c.sem).toBeCloseTo(2.49, 2);
  });

  it('Single biological replicate: SD and SEM empty', () => {
    const a: Assignment = {};
    assignRange(a, 0, 3, 5, 'E+s+p api', 1);
    const c = computeResults(plate, a, none, refSettings).conditions[0];
    expect(c.n).toBe(1);
    expect(c.mean).toBeCloseTo(182.94, 2);
    expect(c.sd).toBeNull();
    expect(c.sem).toBeNull();
  });
});

describe('full reference plate regression', () => {
  it('matches D48:K50 of the reference workbook', () => {
    const ws = loadReferenceWorkbook().Sheets['Magellan Sheet 1'];
    const r = computeResults(plate, referenceAssignment(), none, refSettings);
    expect(r.conditions).toHaveLength(8);
    expect(r.bioNumbers).toEqual([1, 2, 3]);
    for (const [col, name] of REFERENCE_RESULT_COLUMNS) {
      const c = r.conditions.find((x) => x.condition === name)!;
      for (let bio = 1; bio <= 3; bio++) {
        expect(c.bioValues.get(bio)).toBeCloseTo(ws[`${col}${47 + bio}`].v as number, 9);
      }
    }
  });

  it('orders conditions by the given order, appending unknown ones', () => {
    const r = computeResults(plate, referenceAssignment(), none, refSettings, ['Pao1 api', 'gone']);
    expect(r.conditions[0].condition).toBe('Pao1 api');
    expect(r.conditions).toHaveLength(8);
  });
});
