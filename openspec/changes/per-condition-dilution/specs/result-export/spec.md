# Spec Delta

## MODIFIED Requirements

### Requirement: Excel export
The system SHALL download an `.xlsx` workbook containing: a color-coded plate layout sheet as its first sheet; the plate values with each well's condition, biological replicate and exclusion status; one row per technical-replicate group with its wells, values, excluded wells, technical mean, dilution and final value; and the result table with summary statistics, each condition's dilution, the default dilution and the units used. Numbers SHALL be stored at full precision.

#### Scenario: Excluded wells are traceable
- **WHEN** well G6 is excluded and the user exports to Excel
- **THEN** the workbook marks G6 as excluded in the plate data and lists it as excluded in the `Pao1 api` bio 2 group row

#### Scenario: Settings are recorded
- **WHEN** the user exports with default dilution 1:500, `Pao1 api` at 1:100 and output unit ng/ml
- **THEN** the workbook states default dilution 500, dilution 100 for `Pao1 api`, dilution 500 for every condition without its own dilution, and unit ng/ml next to the results

## ADDED Requirements

### Requirement: Plate layout sheet for the lab record
The first sheet of the Excel export SHALL show the 8 x 12 plate with row letters and column numbers. Each well cell SHALL show its condition, biological replicate and value (or original text), filled with the condition's on-screen color. Excluded wells SHALL be visibly marked. Below the plate a legend SHALL list each condition in condition order with its color and `1:x` dilution. The sheet SHALL state the source name, export date, units and default dilution.

#### Scenario: Colored plate map
- **WHEN** A3:A5 are `E+s+p api` bio 1 and the user exports to Excel
- **THEN** cells A3, A4 and A5 of the layout sheet show `E+s+p api`, `bio 1` and their values, with the same fill color as those wells on screen

#### Scenario: Legend with dilutions
- **WHEN** `E+s+p api` uses the default 1:500 and `Pao1 api` has 1:100
- **THEN** the legend lists `E+s+p api` with `1:500` and `Pao1 api` with `1:100`, each beside its color

#### Scenario: Excluded and unassigned wells
- **WHEN** G6 is excluded and A1 is unassigned
- **THEN** G6 is marked as excluded on the layout sheet and A1 has no fill and no condition

### Requirement: Prism copy carries no dilution
"Copy for Prism" SHALL contain only condition names and biological-replicate values; dilutions SHALL NOT be added to the copied text.

#### Scenario: Copy with mixed dilutions
- **WHEN** conditions use different dilutions and the user clicks "Copy for Prism"
- **THEN** the copied text has the condition-name line and value lines only
