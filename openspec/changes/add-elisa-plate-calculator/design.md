# Design

## Context

The repository currently contains only the OpenSpec scaffold, a CI workflow that builds/tests a Node project when `package.json` exists, and one reference plate export (`exp_301026_ETI_SP8_RM_PAO1_overnight_pl2.xlsx`, sheet `Magellan Sheet 1`). That sheet holds several 8 x 12 blocks (raw OD, edited OD, concentrations). The concentration block is at A28:M36 with row letters in column A and column numbers in row 28; column 1 holds standards, values can be `NoCalc` or empty. The user's manual result block (D39:K50) shows the target calculation: `AVERAGE` of technical replicates, then `x500` (dilution), then `/1000` (pg/ml to ng/ml). See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- A single static page that works offline after load and keeps all data in the browser.
- A calculation core that is independent of the UI and unit-tested against the reference file.
- Recalculation on every edit (assignment, exclusion, dilution, unit) with no "Calculate" button.

**Non-Goals:**
- Fitting standard curves or converting OD to concentration (input is already concentration).
- Statistical tests (t-test, ANOVA); Prism does these after paste.
- Plate formats other than 96-well (8 x 12).
- Multi-user storage, accounts, or a backend.
- Chart formats other than PNG.

## Decisions

### Stack: TypeScript + React + Vite, static build
React manages the many interdependent pieces of state (values, assignments, exclusions, settings, results). Vite gives a fast dev server and a static `dist/` that can be opened locally or hosted later. CI already runs `npm ci / lint / test / build`.
- Alternative: single vanilla HTML file. Zero setup, but drag-select, exclusion and templates would become hard to maintain and test.
- Alternative: Python + Streamlit. Easy statistics, but drag-selection on a grid is awkward and it requires a running Python process.

### Libraries
- SheetJS (`xlsx`) for reading the Magellan `.xlsx` and writing the export workbook.
- Chart.js for the bar chart; PNG export through the canvas (`toBase64Image`), with error bars and replicate points drawn by a small custom plugin (as in the explore-phase prototype).
- Vitest for unit tests.
- No UI component library; plain CSS keeps the bundle small.

### Data model
```
Plate        = { values: Cell[8][12] }        Cell = number | null   (null = blank / NoCalc / text)
Assignment   = Map<WellId, { condition: string, bio: number }>      WellId = "A1".."H12"
Excluded     = Set<WellId>
Settings     = { dilution: number, inputUnit, outputUnit, errorBar: "SD" | "SEM",
                 conditionOrder: string[] }
Template     = { name, assignment, settings }   (exclusions are per-plate and not saved in templates)
```
Technical-replicate groups are derived, never stored: group wells by `(condition, bio)`. This makes horizontal and vertical layouts equivalent and supports any replicate count.

### Calculation pipeline (pure functions)
```
wells --group by (condition, bio)--> drop excluded & null --> mean --> x dilution --> x unitFactor
     --> BioValue(condition, bio, value | null)
     --> per condition: n (non-null bio values), mean, SD (sample, n-1), SEM = SD / sqrt(n)
```
Unit factors: pg/ml, ng/ml, ug/ml, related by powers of 1000. Defaults: dilution 1, input pg/ml, output pg/ml. The user's reference case is dilution 500, output ng/ml.

### Input parsing
- Paste: split on newlines and tabs. If the first row is `<>`, `1..12` and the first column is `A..H`, strip headers; otherwise expect exactly 8 rows x 12 values. Cells that do not parse as numbers (including `NoCalc`) become null but their original text is kept for display.
- `.xlsx`: list 8 x 12 blocks found by locating `<>` header cells, preview them, and let the user pick one (the concentration block is typically the last numeric one).

### Well assignment UX
Mouse-down/drag/up selects a rectangle (shift/cmd adds to selection). A side panel takes a condition name (free text with autocomplete from existing conditions) and a bio number; "Apply" writes the assignment, "Clear" removes it. Each condition gets a color; bio number is shown as a small badge. Excluded wells are shown struck through/greyed and toggled from the panel or by double-click.

### Near-duplicate condition names
Names are kept verbatim. Names that are equal after lower-casing and collapsing whitespace are flagged with a warning and a one-click "merge into ..." action; nothing is merged automatically.

### Exports
- Excel workbook, three sheets: `Plate` (values with assigned condition/bio per well and exclusion marks), `Replicates` (one row per technical group: condition, bio, wells, raw values, excluded wells, technical mean, final value), `Results` (Prism Column layout plus mean / SD / SEM / n rows and the settings used).
- Prism clipboard: tab-separated, first line condition names in `conditionOrder`, then one line per bio replicate; missing values are empty strings. No summary rows (Prism computes them).
- PNG: chart canvas rendered at 2x device pixel ratio on a white background.

### Templates
Stored in `localStorage` as JSON under a versioned key. Applying a template sets assignment and settings; it does not touch plate values or exclusions. Templates can also be exported/imported as a `.json` file so they survive browser data clearing.

## Risks / Trade-offs

- [Magellan export layout varies between runs] → Block detection is based on `<>` header cells and always ends in a user-confirmed preview; paste remains a fallback.
- [localStorage can be cleared or unavailable] → Wrap access in try/catch, keep the app usable without it, offer JSON template export/import.
- [Floating-point display noise] → Round only for display (configurable decimals, default 2); exports keep full precision in Excel and 4 significant decimals in clipboard text.
- [User assigns inconsistent bio numbers (e.g. bio 1, 2, 4)] → Result table rows are the sorted union of bio numbers used; gaps show as empty cells, never as zero.
- [SD with n < 2] → Shown as empty, not 0, and the bar is drawn without an error bar.

## Migration Plan

New application; nothing to migrate. Deploy by running `npm run build` and opening `dist/index.html` (or hosting `dist/` on GitHub Pages later). Rollback is deleting the build.

## Open Questions

- Whether to add GitHub Pages deployment for lab mates (does not change specs; can be a later task).
- Default number of displayed decimals (2 assumed).
