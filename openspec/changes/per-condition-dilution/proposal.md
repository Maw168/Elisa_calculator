# Proposal

## Why

Conditions on one plate are often measured at different sample dilutions (for example `E+S+P` at 1:500 and `Pao1` at 1:100), but the calculator applies a single dilution factor to every condition, so mixed-dilution plates give wrong results. The exported workbook also does not record the plate layout in a form that can be read back later as a lab note.

## What Changes

- Each condition gets its own dilution, entered as `1:x` (for example `1:500`) in a new "Conditions & dilution" panel next to the assign panel. Conditions without their own value use a default dilution, which replaces today's single dilution field.
- A plain number (for example `500`) is accepted as shorthand for `1:500`. Zero, negative or non-numeric dilutions are rejected and the last valid value stays in use.
- Dilutions are remembered by condition name: clearing a condition and assigning the same name again restores its dilution.
- Merging near-duplicate names keeps the dilution of the name that is kept, and warns when the two dilutions differed.
- Templates store the default and the per-condition dilutions. Templates saved before this change still load and give every condition the default.
- The Excel export gains a first sheet, "Layout": a color-coded 8 x 12 plate map (condition, bio replicate, value, exclusion per well) with a legend of condition, color and dilution plus experiment metadata, intended as a lab note / experiment archive.
- The Excel export records each condition's dilution in the replicate and result sheets. "Copy for Prism" is unchanged and carries no dilution.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `replicate-statistics`: the dilution factor becomes per condition with a default fallback, entered in `1:x` notation.
- `plate-layout`: new per-condition dilution panel, dilutions remembered by name, merge behavior for dilutions, templates store per-condition dilutions.
- `result-export`: Excel export adds a color-coded Layout sheet and records per-condition dilutions.

## Impact

- `src/core/types.ts` (`Settings`), `src/core/calc.ts` (per-group factor, `1:x` parsing), `src/core/templates.ts` (stored settings, backward-compatible load), `src/core/assignment.ts` (merge).
- `src/App.tsx` and a new conditions/dilution panel component; the single dilution input moves into it.
- `src/core/export.ts`: workbook writing moves from SheetJS to `exceljs` (SheetJS cell styles are not available in the community edition). SheetJS stays for reading `.xlsx` input.
- New dependency: `exceljs`, loaded only when exporting so page load is unaffected.
- Tests in `src/core/*.test.ts` and the reference fixture.
