# Tasks

## 1. Per-condition dilution in the calculation

- [x] 1.1 Add `dilutions: Record<string, number>` to `Settings` and `DEFAULT_SETTINGS` (`{}`) in `src/core/types.ts`; verify `npm run build` type-checks
- [x] 1.2 Extend `parseDilution` in `src/core/calc.ts` to accept `1:x`, `1 : x` and bare `x`, and add a `formatDilution(x)` returning `1:x`; verify new unit tests in `calc.test.ts` cover valid, zero, negative, text and empty input
- [x] 1.3 Make `computeResults` use `dilutions[condition] ?? dilution` per group; verify tests for the reference D48 scenario (default 1:500), the mixed 1:500 / 1:100 scenario and the default fallback pass

## 2. Templates and merging

- [x] 2.1 Update `toSettings` in `src/core/templates.ts` to read valid `dilutions` entries and default to `{}`; verify tests that an old template (dilution 500, no dilutions) loads with default 500 and no overrides, and invalid entries are dropped
- [x] 2.2 Prune dilutions to the template's assigned conditions when saving a template; verify a test that a dormant entry is not saved
- [x] 2.3 Add a pure helper for merging dilutions (kept name wins, otherwise inherit, remove merged name; report conflict when both differ); verify tests in `logic.test.ts` for keep, inherit and conflict cases

## 3. Conditions & dilution panel

- [x] 3.1 Move `PALETTE` and the color mapping out of `App.tsx` into a shared module used by the plate grid; verify colors on screen are unchanged in the dev preview
- [x] 3.2 Create `src/components/ConditionsPanel.tsx` listing assigned conditions in condition order with swatch, name and dilution field (placeholder = default), plus the default field; each field keeps its own text state, shows an error for invalid input and formats to `1:x` on blur; verify in the dev preview that entering `1:100` / `100` updates results and invalid input shows an error while results keep the last valid value
- [x] 3.3 Place the panel next to the assign panel in `App.tsx` and remove the old single dilution input; wire template apply to set default and per-condition texts; verify applying a template in the preview restores all dilutions
- [x] 3.4 Keep dilution entries when a condition loses all its wells so re-assigning the name restores it; verify in the preview by clearing and re-assigning `Pao1 api`
- [x] 3.5 Show both dilutions and which is kept in the near-duplicate merge warning when they differ, and apply the merge helper on merge; verify in the preview with `E+s+p api` 1:500 and `E+S+P api` 1:250

## 4. Excel export with exceljs and Layout sheet

- [x] 4.1 Add `exceljs` to dependencies; verify `npm install` succeeds and `npm run build` emits it as a separate lazily loaded chunk
- [x] 4.2 Port the Plate, Replicates and Results sheets in `src/core/export.ts` to `exceljs` (async `buildWorkbook`, download via `writeBuffer` + Blob, dynamic import in the export handler), adding the dilution column to Replicates and the default + per-condition dilution rows to Results; verify export tests read the buffer back and check G6 exclusion and the recorded dilutions
- [x] 4.3 Add the Layout sheet as the first sheet: metadata rows, 8 x 12 grid with wrapped condition / bio / value text, condition fills from the shared palette, excluded wells grey + strikethrough + `EXCLUDED`, legend with swatch, name, `1:x` dilution and bio numbers, column widths, row heights and landscape fit-to-width; verify tests that A3 has the `E+s+p api` fill and text, G6 is marked excluded, A1 has no fill, and the legend lists dilutions
- [x] 4.4 Confirm `prismText` output is unchanged with mixed dilutions; verify an existing or new test asserts no dilution in the copied text
- [x] 4.5 Update README export section to describe the Layout sheet and per-condition dilution; verify the README matches the UI labels

## 5. Integration check

- [x] 5.1 Run `npm test`, `npm run lint` and `npm run build`; verify all pass
- [x] 5.2 In the dev preview load `exp_301026_ETI_SP8_RM_PAO1_overnight_pl2.xlsx`, assign the 8 conditions, set default 1:500 and one condition to a different dilution, export, and open the workbook to check the Layout colors match the screen and results match the hand-calculated values

## Workflow follow-up

- Archive the change after implementation is reviewed, syncing the delta specs into `openspec/specs/`.
