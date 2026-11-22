import type { Workbook, Worksheet } from 'exceljs';
import type { Results } from './calc';
import { dilutionFor, formatDilution } from './calc';
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

export interface ExportInput {
  plate: Plate;
  assignment: Assignment;
  excluded: ReadonlySet<WellId>;
  settings: Settings;
  results: Results;
  /** On-screen color (#rrggbb) of a condition. */
  colorOf: (condition: string) => string;
  /** Name of the loaded file or "pasted". */
  source: string;
  exportedAt: Date;
}

/** exceljs is large, so it is loaded only when the user exports. */
async function loadExcelJs(): Promise<typeof import('exceljs')> {
  const mod = (await import('exceljs')) as typeof import('exceljs') & { default?: typeof import('exceljs') };
  return mod.default ?? mod;
}

/** #rrggbb -> ARGB as exceljs expects it. */
export function argb(hex: string): string {
  return `FF${hex.replace('#', '').toUpperCase()}`;
}

function formatDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function bold(ws: Worksheet, row: number) {
  ws.getRow(row).font = { bold: true };
}

const LAYOUT_GRID_TOP = 8;

function layoutSheet(wb: Workbook, input: ExportInput) {
  const { plate, assignment, excluded, settings, results, colorOf } = input;
  const ws = wb.addWorksheet('Layout', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.getColumn(1).width = 6;
  for (let c = 2; c <= COLS.length + 1; c++) ws.getColumn(c).width = 15;

  ws.getCell('A1').value = 'Plate layout';
  ws.getCell('A1').font = { bold: true, size: 14 };
  const meta: [string, string][] = [
    ['Source', input.source === 'pasted' || input.source === '' ? 'pasted data' : input.source],
    ['Exported', formatDate(input.exportedAt)],
    ['Units', `${settings.inputUnit} -> ${settings.outputUnit}`],
    ['Default dilution', formatDilution(settings.dilution)],
  ];
  meta.forEach(([k, v], i) => {
    ws.getCell(2 + i, 1).value = k;
    ws.getCell(2 + i, 1).font = { bold: true };
    ws.getCell(2 + i, 3).value = v;
  });

  const border = { style: 'thin' as const, color: { argb: 'FFB0B7BF' } };
  const header = ws.getRow(LAYOUT_GRID_TOP - 1);
  COLS.forEach((c, j) => {
    header.getCell(j + 2).value = c;
  });
  header.font = { bold: true };
  header.alignment = { horizontal: 'center' };

  ROWS.forEach((letter, r) => {
    const row = ws.getRow(LAYOUT_GRID_TOP + r);
    row.height = 60;
    const label = row.getCell(1);
    label.value = letter;
    label.font = { bold: true };
    label.alignment = { horizontal: 'center', vertical: 'middle' };
    COLS.forEach((_, c) => {
      const id = wellId(r, c);
      const cell = row.getCell(c + 2);
      const plateCell = plate[r][c];
      const a = assignment[id];
      const isExcluded = excluded.has(id);
      const value = plateCell.value === null ? plateCell.text : String(plateCell.value);
      const lines = a ? [a.condition, `bio ${a.bio}`, value] : [value];
      if (isExcluded) lines.push('EXCLUDED');
      cell.value = lines.filter((l) => l !== '').join('\n');
      cell.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
      cell.border = { top: border, left: border, bottom: border, right: border };
      if (a) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(colorOf(a.condition)) } };
      if (isExcluded) cell.font = { color: { argb: 'FF8C959F' }, strike: true };
    });
  });

  let r = LAYOUT_GRID_TOP + ROWS.length + 1;
  ws.getCell(r, 1).value = 'Legend';
  bold(ws, r);
  r++;
  ['Color', 'Condition', 'Dilution', 'Bio replicates'].forEach((h, i) => {
    ws.getCell(r, i + 1).value = h;
  });
  bold(ws, r);
  for (const c of results.conditions) {
    r++;
    ws.getCell(r, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(colorOf(c.condition)) } };
    ws.getCell(r, 2).value = c.condition;
    ws.getCell(r, 3).value = formatDilution(dilutionFor(settings, c.condition));
    ws.getCell(r, 4).value = [...c.bioValues.keys()].join(', ');
  }
}

function plateSheet(wb: Workbook, { plate, assignment, excluded }: ExportInput) {
  const ws = wb.addWorksheet('Plate');
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
  const wells: unknown[][] = [['Well', 'Value', 'Text', 'Condition', 'Bio', 'Excluded']];
  ROWS.forEach((_, i) =>
    COLS.forEach((_, j) => {
      const id = wellId(i, j);
      const c = plate[i][j];
      const a = assignment[id];
      wells.push([id, c.value, c.text, a?.condition ?? '', a?.bio ?? null, excluded.has(id) ? 'yes' : '']);
    }),
  );
  ws.addRows([['Values'], header, ...values, [], ['Assignments'], header, ...labels, [], ['Wells'], ...wells]);
}

function replicatesSheet(wb: Workbook, { results, settings }: ExportInput) {
  const ws = wb.addWorksheet('Replicates');
  const rows: unknown[][] = [
    [
      'Condition',
      'Bio',
      'Wells',
      'Values',
      'Excluded wells',
      `Technical mean (${settings.inputUnit})`,
      'Dilution (1:x)',
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
      g.dilution,
      g.value,
    ]);
  }
  ws.addRows(rows);
}

function resultsSheet(wb: Workbook, { results, settings }: ExportInput) {
  const ws = wb.addWorksheet('Results');
  const names = results.conditions.map((c) => c.condition);
  const rows: unknown[][] = [
    ['Default dilution (1:x)', settings.dilution],
    ['Input unit', settings.inputUnit],
    ['Output unit', settings.outputUnit],
    [],
    [`Values (${settings.outputUnit})`, ...names],
    ['Dilution (1:x)', ...names.map((c) => dilutionFor(settings, c))],
  ];
  for (const bio of results.bioNumbers) {
    rows.push([`bio ${bio}`, ...results.conditions.map((c) => c.bioValues.get(bio) ?? null)]);
  }
  rows.push(['Mean', ...results.conditions.map((c) => c.mean)]);
  rows.push(['SD', ...results.conditions.map((c) => c.sd)]);
  rows.push(['SEM', ...results.conditions.map((c) => c.sem)]);
  rows.push(['n', ...results.conditions.map((c) => c.n)]);
  ws.addRows(rows);
}

/** Builds the export workbook and returns it as .xlsx bytes. */
export async function buildWorkbook(input: ExportInput): Promise<ArrayBuffer> {
  const ExcelJS = await loadExcelJs();
  const wb = new ExcelJS.Workbook();
  wb.created = input.exportedAt;
  layoutSheet(wb, input);
  plateSheet(wb, input);
  replicatesSheet(wb, input);
  resultsSheet(wb, input);
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

export function downloadWorkbook(bytes: ArrayBuffer, filename: string): void {
  const url = URL.createObjectURL(
    new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
