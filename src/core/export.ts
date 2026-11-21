import * as XLSX from 'xlsx';
import type { Results } from './calc';
import type { Assignment, Plate, Settings, WellId } from './types';
import { COLS, ROWS, wellId } from './types';

/** True when at least one condition has a biological-replicate value. */
export function hasExportableResults(results: Results): boolean {
  return results.conditions.some((c) => c.n > 0);
}

/**
 * Tab-separated text for a Prism Column table: a header line of condition names,
 * then one line per biological replicate. Missing values are empty fields.
 */
export function prismText(results: Results): string {
  const lines = [results.conditions.map((c) => c.condition).join('\t')];
  for (const bio of results.bioNumbers) {
    lines.push(
      results.conditions
        .map((c) => {
          const v = c.bioValues.get(bio);
          return v == null ? '' : v.toFixed(4);
        })
        .join('\t'),
    );
  }
  return lines.join('\n') + '\n';
}

function plateSheet(plate: Plate, assignment: Assignment, excluded: ReadonlySet<WellId>): XLSX.WorkSheet {
  const header = ['<>', ...COLS];
  const values = ROWS.map((r, i) => [r, ...plate[i].map((c) => c.value ?? c.text)]);
  const labels = ROWS.map((r, i) => [
    r,
    ...COLS.map((_, j) => {
      const id = wellId(i, j);
      const a = assignment[id];
      const label = a ? `${a.condition} | bio ${a.bio}` : '';
      return excluded.has(id) ? `${label} [EXCLUDED]`.trim() : label;
    }),
  ]);
  const wells = [['Well', 'Value', 'Text', 'Condition', 'Bio', 'Excluded']];
  ROWS.forEach((_, i) =>
    COLS.forEach((_, j) => {
      const id = wellId(i, j);
      const c = plate[i][j];
      const a = assignment[id];
      wells.push([id, c.value as never, c.text, a?.condition ?? '', (a?.bio ?? '') as never, excluded.has(id) ? 'yes' : '']);
    }),
  );
  return XLSX.utils.aoa_to_sheet([
    ['Values'],
    header,
    ...values,
    [],
    ['Assignments'],
    header,
    ...labels,
    [],
    ['Wells'],
    ...wells,
  ]);
}

function replicatesSheet(results: Results, settings: Settings): XLSX.WorkSheet {
  const rows: unknown[][] = [
    [
      'Condition',
      'Bio',
      'Wells',
      'Values',
      'Excluded wells',
      `Technical mean (${settings.inputUnit})`,
      `Final value (${settings.outputUnit})`,
    ],
  ];
  const order = results.conditions.map((c) => c.condition);
  const groups = [...results.groups].sort(
    (a, b) => order.indexOf(a.condition) - order.indexOf(b.condition) || a.bio - b.bio,
  );
  for (const g of groups) {
    rows.push([
      g.condition,
      g.bio,
      g.wells.join(', '),
      g.values.map((v) => (v === null ? 'missing' : String(v))).join(', '),
      g.excludedWells.join(', '),
      g.technicalMean,
      g.value,
    ]);
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

function resultsSheet(results: Results, settings: Settings): XLSX.WorkSheet {
  const names = results.conditions.map((c) => c.condition);
  const rows: unknown[][] = [
    ['Dilution factor', settings.dilution],
    ['Input unit', settings.inputUnit],
    ['Output unit', settings.outputUnit],
    [],
    [`Values (${settings.outputUnit})`, ...names],
  ];
  for (const bio of results.bioNumbers) {
    rows.push([`bio ${bio}`, ...results.conditions.map((c) => c.bioValues.get(bio) ?? null)]);
  }
  rows.push(['Mean', ...results.conditions.map((c) => c.mean)]);
  rows.push(['SD', ...results.conditions.map((c) => c.sd)]);
  rows.push(['SEM', ...results.conditions.map((c) => c.sem)]);
  rows.push(['n', ...results.conditions.map((c) => c.n)]);
  return XLSX.utils.aoa_to_sheet(rows);
}

export function buildWorkbook(
  plate: Plate,
  assignment: Assignment,
  excluded: ReadonlySet<WellId>,
  settings: Settings,
  results: Results,
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, plateSheet(plate, assignment, excluded), 'Plate');
  XLSX.utils.book_append_sheet(wb, replicatesSheet(results, settings), 'Replicates');
  XLSX.utils.book_append_sheet(wb, resultsSheet(results, settings), 'Results');
  return wb;
}

export function downloadWorkbook(wb: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(wb, filename);
}
