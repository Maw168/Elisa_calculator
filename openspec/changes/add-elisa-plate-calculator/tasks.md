# Tasks

## 1. Project setup

- [x] 1.1 Scaffold a Vite + React + TypeScript app at the repository root (`package.json`, `index.html`, `src/`, `tsconfig.json`) and verify `npm run dev` serves a blank page and `npm run build` produces `dist/index.html`
- [x] 1.2 Add dependencies `xlsx` and `chart.js`, dev dependencies `vitest` and ESLint, with `test` and `lint` scripts; verify `npm ci && npm run lint && npm test && npm run build` passes locally (as CI runs it)
- [x] 1.3 Copy `exp_301026_ETI_SP8_RM_PAO1_overnight_pl2.xlsx` into `src/__fixtures__/` and verify a Vitest smoke test can open it with SheetJS and read cell D29 = 372.19

## 2. Calculation core (replicate-statistics)

- [x] 2.1 Define the data model types (plate cells, well ids A1-H12, assignment, exclusions, settings) in `src/core/types.ts`; verify it type-checks with `tsc --noEmit`
- [x] 2.2 Implement grouping of assigned wells into technical-replicate groups by (condition, bio) and the technical mean ignoring excluded/missing wells; verify unit tests for the spec scenarios "Three valid wells" (365.87), "One excluded well" (366.16) and "All wells missing" (empty, not zero)
- [x] 2.3 Implement dilution factor and pg/ml, ng/ml, ug/ml conversion with validation of dilution; verify unit tests for "Reproduce the reference workbook" (182.94 ng/ml) and "Invalid dilution"
- [x] 2.4 Implement per-condition n, mean, sample SD and SEM with SD/SEM empty for n < 2; verify unit tests for "Three biological replicates" (185.58 / 4.32 / 2.49) and "Single biological replicate"
- [x] 2.5 Add a full-plate regression test that assigns the reference layout (8 conditions x 3 bio reps) and checks every biological-replicate value against D48:K50 of the reference workbook; verify the test passes

## 3. Plate input (plate-layout)

- [x] 3.1 Implement paste parsing (tab/newline split, header row and row-letter column detection, `NoCalc`/blank as missing with original text kept, shape errors); verify unit tests for "Paste block with headers from Excel" (A3 = 372.19, H12 = 145.32), "Paste block without headers", "Paste with the wrong shape" and "NoCalc cell"
- [x] 3.2 Implement `.xlsx` block detection (find `<>` header cells, extract 8 x 12 blocks); verify unit tests that the reference file yields the block at row 28 identical to the pasted A28:M36, and that a file with no block returns an error
- [x] 3.3 Build the input UI: paste area and file picker with block preview and confirm; verify in the browser that pasting A28:M36 and opening the reference file both fill the grid with the same values, and that errors leave the current plate unchanged

## 4. Well assignment UI (plate-layout)

- [x] 4.1 Build the 8 x 12 plate grid showing values, missing text, condition color and bio badge; verify in the browser that the reference plate renders all 96 wells correctly
- [x] 4.2 Implement rectangle drag-select and shift/cmd add-to-selection; verify in the browser that dragging A3 to A5 selects exactly those three wells
- [x] 4.3 Implement the assignment panel (condition text with autocomplete, bio number, Apply, Clear); verify scenarios "Assign three wells in a row" and "Clear an assignment" in the browser, and a unit test that re-assigning replaces the old assignment
- [x] 4.4 Implement exclude/restore (panel button and double-click) with excluded styling that keeps the assignment; verify scenarios "Exclude an outlier well" (G6) and "Restore a well" in the browser
- [x] 4.5 Implement near-duplicate condition detection and the merge action; verify unit tests for "Case difference" and "User merges names" (bio numbers kept), and that nothing merges without user action

## 5. Results table and chart (result-export)

- [x] 5.1 Build the settings bar (dilution, input unit, output unit, SD/SEM toggle) wired to live recalculation; verify in the browser that changing dilution or excluding a well updates results immediately ("Excluding a well updates results")
- [x] 5.2 Build the Prism Column-style result table (bio rows sorted, then mean/SD/SEM/n, unit shown, empty cells for gaps, values rounded to 2 decimals for display); verify scenarios "Reference plate fully assigned" and "Gap in biological replicate numbers"
- [x] 5.3 Implement condition ordering (first-assigned order, user reorder) shared by table, chart and exports; verify scenario "Reorder conditions" via a unit test on the ordering function and in the browser
- [x] 5.4 Build the Chart.js bar chart with mean bars, SD/SEM error bars (omitted for n < 2) and biological-replicate points, y-axis labelled with the unit; verify scenario "Switch error bar to SEM" in the browser

## 6. Exports (result-export)

- [x] 6.1 Implement "Copy for Prism" tab-separated text (header line, bio rows, empty fields, at least 4 decimals, no summary rows) with a selectable-text fallback when clipboard access is refused; verify a unit test of the generated text for the reference plate, a manual paste into a Prism Column table ("Paste into a Prism Column table"), and the "Clipboard blocked" fallback
- [x] 6.2 Implement the Excel export with sheets `Plate`, `Replicates` and `Results` (full precision, settings recorded); verify a unit test that reads the generated workbook back and checks "Excluded wells are traceable" (G6) and "Settings are recorded" (dilution 500, ng/ml)
- [x] 6.3 Implement PNG download at 2x resolution on a white background; verify scenario "Download chart" by opening the downloaded file
- [x] 6.4 Disable all export actions until at least one condition has a value; verify scenario "Empty plate" in the browser

## 7. Templates (plate-layout)

- [x] 7.1 Implement save/apply/delete of named templates (assignments + settings, not values or exclusions) in versioned localStorage with try/catch; verify unit tests that applying a template leaves values and exclusions unchanged, and scenario "Reuse a layout on a new plate" in the browser after a page reload
- [x] 7.2 Implement template export/import as a `.json` file and the storage-unavailable notice; verify a round-trip unit test and scenario "Browser storage unavailable" by simulating a throwing localStorage

## 8. Documentation and end-to-end check

- [x] 8.1 Write `README.md` with how to install, run (`npm run dev`), build and open `dist/index.html`, plus a short usage walkthrough (paste, assign, exclude, export); verify the documented commands run as written
- [x] 8.2 End-to-end check with the reference file: load it, assign the full layout, set dilution 500 and output ng/ml, and confirm the table matches D48:K50, the Prism paste works, the Excel export opens in Excel and the PNG downloads; verify `npm run lint && npm test && npm run build` pass

## Workflow follow-up

- Optional later work: add GitHub Pages deployment if lab mates need access (open question in design.md).
- Archive the change after implementation is reviewed.
