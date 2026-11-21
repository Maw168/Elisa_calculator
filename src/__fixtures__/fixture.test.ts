import { describe, expect, it } from 'vitest';
import { loadReferenceWorkbook } from './fixture';

describe('reference fixture', () => {
  it('opens with SheetJS and reads D29', () => {
    const wb = loadReferenceWorkbook();
    const ws = wb.Sheets['Magellan Sheet 1'];
    expect(ws['D29'].v).toBe(372.19);
  });
});
