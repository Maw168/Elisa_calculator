import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

export function loadReferenceWorkbook(): XLSX.WorkBook {
  const path = fileURLToPath(new URL('./reference.xlsx', import.meta.url));
  return XLSX.read(readFileSync(path), { type: 'buffer' });
}
