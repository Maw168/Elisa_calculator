# result-export Specification

## Purpose

Presents calculated biological-replicate values as a Prism Column-style table and a bar chart, and lets the user take them out of the page as an Excel workbook, Prism-ready clipboard text, or a PNG image.

## Requirements

### Requirement: Result table in Prism Column layout
The system SHALL show a table with one column per condition and one row per biological replicate number in use (sorted ascending), followed by rows for mean, SD, SEM and n. A missing biological-replicate value SHALL appear as an empty cell. The table SHALL show the output unit.

#### Scenario: Reference plate fully assigned
- **WHEN** the reference plate has 8 conditions with biological replicates 1-3 each
- **THEN** the table has 8 condition columns, rows bio 1, bio 2, bio 3, then mean, SD, SEM and n

#### Scenario: Gap in biological replicate numbers
- **WHEN** a condition uses biological replicates 1 and 3 only
- **THEN** its bio 2 cell is empty

### Requirement: Condition order
Conditions SHALL appear in the order they were first assigned, and the user SHALL be able to reorder them. The same order SHALL be used by the table, the chart and every export.

#### Scenario: Reorder conditions
- **WHEN** the user moves `Pao1 api` to the first position
- **THEN** `Pao1 api` is the first column of the table, the first bar of the chart and the first column in exports

### Requirement: Bar chart
The system SHALL draw one bar per condition at the condition mean, an error bar of SD or SEM as chosen by the user (SD by default), and one point per biological-replicate value. Conditions with n less than 2 SHALL be drawn without an error bar. The y-axis SHALL be labelled with the output unit.

#### Scenario: Switch error bar to SEM
- **WHEN** the user selects SEM
- **THEN** every error bar shows mean plus and minus SEM

### Requirement: Copy for Prism
The system SHALL copy the biological-replicate values to the clipboard as tab-separated text: a first line of condition names, then one line per biological replicate row, with empty fields for missing values and no summary rows. Values SHALL keep at least 4 decimal places.

#### Scenario: Paste into a Prism Column table
- **WHEN** the user clicks "Copy for Prism" and pastes into the first cell of a Prism Column data table
- **THEN** each condition fills one column titled with its name and the biological-replicate values fill the rows below

#### Scenario: Clipboard blocked
- **WHEN** the browser refuses clipboard access
- **THEN** the system shows the text in a selectable box so the user can copy it manually

### Requirement: Excel export
The system SHALL download an `.xlsx` workbook containing: the plate values with each well's condition, biological replicate and exclusion status; one row per technical-replicate group with its wells, values, excluded wells, technical mean and final value; and the result table with summary statistics and the dilution factor and units used. Numbers SHALL be stored at full precision.

#### Scenario: Excluded wells are traceable
- **WHEN** well G6 is excluded and the user exports to Excel
- **THEN** the workbook marks G6 as excluded in the plate data and lists it as excluded in the `Pao1 api` bio 2 group row

#### Scenario: Settings are recorded
- **WHEN** the user exports with dilution 500 and output unit ng/ml
- **THEN** the workbook states dilution 500 and unit ng/ml next to the results

### Requirement: PNG chart export
The system SHALL download the current chart as a PNG image on a white background at no less than twice screen resolution.

#### Scenario: Download chart
- **WHEN** the user clicks "Download PNG"
- **THEN** a PNG file of the chart, including axis labels and unit, is saved

### Requirement: Nothing to export
Export and copy actions SHALL be disabled until at least one condition has a biological-replicate value.

#### Scenario: Empty plate
- **WHEN** no wells are assigned
- **THEN** the Excel, Copy for Prism and PNG actions are disabled
