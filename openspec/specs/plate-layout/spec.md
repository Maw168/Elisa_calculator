# plate-layout Specification

## Purpose

Lets the user load a 96-well plate of ELISA concentration values and describe its layout by assigning each well to an experimental condition and biological replicate, so technical replicates are identified without writing formulas.

## Requirements

### Requirement: Paste plate values
The system SHALL accept pasted tab-separated text and fill an 8 x 12 grid (rows A-H, columns 1-12). A header row (`<>`, `1`..`12`) and a row-letter column (`A`..`H`) SHALL be detected and stripped when present.

#### Scenario: Paste block with headers from Excel
- **WHEN** the user pastes the range A28:M36 copied from the reference sheet
- **THEN** well A3 shows 372.19 and well H12 shows 145.32

#### Scenario: Paste block without headers
- **WHEN** the user pastes 8 lines of 12 tab-separated numbers
- **THEN** the first line fills row A and the first value of each line fills column 1

#### Scenario: Paste with the wrong shape
- **WHEN** the pasted text does not contain 8 rows of 12 values after header removal
- **THEN** the system shows an error naming the detected row and column counts and leaves the current plate unchanged

### Requirement: Load plate values from an Excel file
The system SHALL let the user open an `.xlsx` file, SHALL list the 8 x 12 blocks it finds with a preview, and SHALL fill the grid from the block the user confirms.

#### Scenario: Pick the concentration block from a Magellan export
- **WHEN** the user opens the reference `.xlsx` and selects the block whose header is at row 28
- **THEN** the grid shows the same values as pasting A28:M36

#### Scenario: File with no plate block
- **WHEN** the opened file contains no 8 x 12 block
- **THEN** the system shows an error and leaves the current plate unchanged

### Requirement: Non-numeric cells are missing values
Cells that are blank or do not parse as a number (for example `NoCalc`) SHALL be treated as missing values. Their original text SHALL remain visible in the grid.

#### Scenario: NoCalc cell
- **WHEN** a pasted cell contains `NoCalc`
- **THEN** the well displays `NoCalc` and is marked as missing

### Requirement: Assign wells to condition and biological replicate
The user SHALL be able to select one or more wells (including by dragging over a rectangle) and assign them a condition name and a positive integer biological replicate number, or clear their assignment. Re-assigning a well SHALL replace its previous assignment.

#### Scenario: Assign three wells in a row
- **WHEN** the user drags over A3:A5 and applies condition `E+s+p api` with biological replicate 1
- **THEN** wells A3, A4 and A5 show the condition's color and the badge `1`

#### Scenario: Clear an assignment
- **WHEN** the user selects an assigned well and clears it
- **THEN** the well has no condition and no longer contributes to any result

### Requirement: Technical replicates are derived from assignments
Wells that share both condition name and biological replicate number SHALL form one technical-replicate group, whatever their position on the plate and however many wells it holds.

#### Scenario: Horizontal biological replicates
- **WHEN** G3:G5 are assigned `Pao1 api` bio 1, G6:G8 `Pao1 api` bio 2 and G9:G11 `Pao1 api` bio 3
- **THEN** `Pao1 api` has three technical-replicate groups of three wells each

#### Scenario: Two technical replicates
- **WHEN** only two wells are assigned to a condition and biological replicate
- **THEN** they form one group of two wells

### Requirement: Exclude and restore wells
The user SHALL be able to exclude any well from calculations and restore it later. Excluded wells SHALL remain visible, visually marked, and keep their assignment.

#### Scenario: Exclude an outlier well
- **WHEN** the user excludes well G6 (value 189.97)
- **THEN** G6 is shown as excluded and keeps its `Pao1 api` bio 2 assignment

#### Scenario: Restore a well
- **WHEN** the user restores an excluded well
- **THEN** the well is no longer marked and contributes to calculations again

### Requirement: Warn about near-duplicate condition names
Condition names SHALL be kept exactly as typed. When two names are equal ignoring letter case and repeated whitespace, the system SHALL show a warning and offer to merge one into the other; it SHALL NOT merge them automatically.

#### Scenario: Case difference
- **WHEN** conditions `E+s+p api` and `E+S+P api` both exist
- **THEN** the system warns that they may be the same condition and offers to merge them

#### Scenario: User merges names
- **WHEN** the user accepts merging `E+S+P api` into `E+s+p api`
- **THEN** all wells previously assigned `E+S+P api` are assigned `E+s+p api` with their biological replicate numbers unchanged

### Requirement: Save and apply layout templates
The user SHALL be able to save the current assignments and calculation settings as a named template, apply a saved template to the current plate, delete templates, and export/import templates as a file. Applying a template SHALL NOT change plate values or excluded wells. Templates SHALL persist across page reloads in the same browser when browser storage is available.

#### Scenario: Reuse a layout on a new plate
- **WHEN** the user pastes new plate values and applies a saved template
- **THEN** the wells receive the template's assignments and settings and the values stay as pasted

#### Scenario: Browser storage unavailable
- **WHEN** browser storage cannot be read or written
- **THEN** the page still works, and the user is told templates will not be remembered but can be exported to a file
