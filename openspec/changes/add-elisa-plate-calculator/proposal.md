# Proposal

## Why

ELISA concentrations (e.g. pg/ml from the Magellan reader software) are currently processed by hand in Excel: for every plate the user writes `AVERAGE()` formulas over technical-replicate wells, collects biological replicates into a result block, applies the dilution factor and unit conversion, and retypes the result into Prism. The plate layout changes between experiments (biological replicates are sometimes arranged vertically, sometimes horizontally), so formulas cannot be reused, and mistakes or outlier wells are easy to miss.

## What Changes

- Add a browser-only interactive web page (no server; data never leaves the machine).
- Load a plate of concentration values by pasting a block copied from Excel, or by opening the Magellan `.xlsx` export and picking the block.
- Show the plate as an 8 x 12 grid (rows A-H, columns 1-12). The user drag-selects wells and assigns them a condition name and a biological replicate number. Wells with the same condition and biological replicate number are automatically treated as technical replicates (2 or 3 per group is typical, any count is allowed).
- Let the user exclude individual wells (e.g. outliers) and restore them; non-numeric cells such as `NoCalc` or blanks are treated as missing.
- Compute, live: technical-replicate mean per biological replicate, multiplied by a dilution factor and converted to a chosen output unit; then mean, SD and SEM across biological replicates per condition.
- Show a result table in Prism Column-table layout (one column per condition, one row per biological replicate) and a bar chart (mean with SD or SEM error bars plus individual biological-replicate points).
- Export: download an Excel workbook, copy the result as tab-separated text for pasting into a Prism Column table, and download the chart as PNG.
- Save and reuse plate layouts as named templates in the browser.

## Capabilities

### New Capabilities
- `plate-layout`: loading plate data into the 8 x 12 grid, assigning wells to condition + biological replicate, excluding wells, warning about near-duplicate condition names, and saving/applying layout templates.
- `replicate-statistics`: turning assigned wells into biological-replicate values (technical mean, dilution, unit conversion) and per-condition summary statistics (mean, SD, SEM, n), including handling of missing and excluded wells.
- `result-export`: presenting results as a Prism Column-style table and bar chart, and exporting them as an Excel workbook, Prism-ready clipboard text, and a PNG image.

### Modified Capabilities
<!-- None: the project has no existing specs. -->

## Impact

- New front-end application in this repository (TypeScript, React, Vite) with `package.json`; the existing CI workflow will pick it up automatically (`npm ci`, lint, test, build).
- New runtime dependencies: SheetJS (`xlsx`) for reading/writing Excel, Chart.js for the chart and PNG export.
- New dev dependency: Vitest for unit tests of the calculation core, using `exp_301026_ETI_SP8_RM_PAO1_overnight_pl2.xlsx` as a reference fixture.
- No backend, accounts, or network calls; templates are stored in browser localStorage.
