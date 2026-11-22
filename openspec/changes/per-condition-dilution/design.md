# Design

## Context

See proposal.md - Why. Today `Settings.dilution` is one number; `computeResults` derives a single `factor` from it and applies it to every technical-replicate group. The dilution input lives in `App.tsx` with its own text state (`dilutionText`) so invalid input can be shown without losing the last valid value. Templates persist `Settings` as JSON in `localStorage` (key `elisa-calculator.templates.v1`) and validate on load via `toSettings`. The Excel export is built with SheetJS Community Edition (`xlsx` 0.20.3), which writes values but not cell fills or fonts. Condition colors come from a 12-entry hex `PALETTE` in `App.tsx`, assigned by first-seen order (`colorKeys`).

## Goals / Non-Goals

**Goals:**
- One factor per condition with a default fallback, without changing results for plates that use a single dilution.
- Old templates and old exported behaviour keep working.
- The Layout sheet uses exactly the colors the user sees on screen.

**Non-Goals:**
- Dilution per biological replicate or per well.
- Serial-dilution curves or choosing the in-range dilution automatically.
- Importing a Layout sheet back into the app.
- Styling of sheets other than Layout beyond what they have today.

## Decisions

### Data model: default plus sparse overrides by name
`Settings` keeps `dilution` as the default and gains `dilutions: Record<string, number>`, keyed by exact condition name. The factor for a group is `(dilutions[condition] ?? dilution) * unitFactor`.
- Keyed by name (not by order index) so an entry survives clearing and re-assigning the same condition, as agreed.
- Entries for conditions not currently assigned are kept in state and ignored by calculation; they are dropped when a template is saved, so templates only carry dilutions for their own conditions.
- Alternative considered: storing dilution on each `WellAssignment`. Rejected: it allows inconsistent dilutions within one condition and makes "change the dilution of a condition" touch every well.

### Parsing `1:x` notation
`parseDilution` accepts `1:x` (whitespace around `:` allowed) or a bare number `x`, and returns `x` when it is finite and > 0, else null. Display always formats as `1:x`. Each input keeps its own text state, like today's single field, so an invalid entry shows an error while the last valid value stays in use. Clearing a per-condition box removes the override (falls back to default); clearing the default box is invalid.

### Panel
A new `ConditionsPanel` component renders, in the shared condition order, a color swatch, the name and a dilution box for each assigned condition, with the default box at the bottom. It replaces the dilution input in the settings area; units and error bar stay where they are. The `colorOf` function and `PALETTE` move out of `App.tsx` into a small shared module so the panel, plate grid and export all use the same mapping.

### Merge
`mergeCondition(from, to)` stays an assignment operation; App additionally resolves dilutions: `to` keeps its own override if it has one, otherwise it inherits `from`'s override; `from`'s entry is removed. If both had overrides with different values, the merge prompt states both values and which one will be kept before the user confirms.

### Templates
`toSettings` reads `dilutions` when it is an object of positive finite numbers, dropping invalid entries; a missing field becomes `{}`. The storage key stays `v1` because the change is additive and old data loads unchanged.

### Excel export with exceljs
The whole export workbook is written with `exceljs`; SheetJS remains only for reading `.xlsx` input (`xlsxBlocks.ts`). Sheet order: Layout, Plate, Replicates, Results.
- Alternatives considered: SheetJS Pro (paid); `xlsx-js-style` fork (less maintained, would replace the reading library too); writing with SheetJS and post-processing the XML (fragile). Two writers for one file are not possible without losing styles.
- `exceljs` is imported with a dynamic `import()` inside the export handler so it is split into its own chunk and not loaded until the user exports.
- `buildWorkbook` becomes async and returns an `exceljs` workbook; download uses `writeBuffer()` and a Blob link.

### Layout sheet
- Metadata rows: source file name, export date, input and output unit, default dilution.
- Grid: header row `1..12`, row letters `A..H`, one cell per well with wrapped text `condition`, `bio n`, value (or original text such as `NoCalc`). Fill = condition color (hex converted to ARGB). Unassigned wells unfilled. Excluded wells: grey font, strikethrough, and an `EXCLUDED` line.
- Legend below the grid in condition order: swatch cell, name, `1:x` dilution, bio numbers used.
- Column widths and row heights set so three lines fit; the sheet is set to landscape fit-to-width for printing.

### Dilution in other sheets
Replicates gets a `Dilution (1:x)` column holding the number `x`. Results replaces the single `Dilution factor` row with `Default dilution (1:x)` in the settings block and a `Dilution (1:x)` row under the condition header, as numbers so they stay usable in formulas.

## Risks / Trade-offs

- [exceljs adds a large dependency] → loaded lazily only on export; page load bundle unchanged.
- [Export tests currently inspect SheetJS workbook objects] → tests write the `exceljs` buffer and read it back with SheetJS (already a dependency) to assert values, plus `exceljs` reads for fills.
- [More than 12 conditions repeat palette colors] → every Layout cell also shows the condition name, and the legend lists all conditions.
- [Dormant dilution entries could surprise a user who reuses a name meaning something else] → the panel shows the restored dilution as soon as the name is assigned, so it is visible before results are used.
- [Merge silently changing a dilution] → merge prompt shows both values when they differ.
