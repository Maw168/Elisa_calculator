# Spec Delta

## ADDED Requirements

### Requirement: Conditions and dilution panel
The system SHALL show a panel next to the assignment controls that lists every assigned condition in the condition order with its color and a dilution field, followed by a default dilution field. A condition whose field is empty SHALL show the default dilution as a placeholder.

#### Scenario: New condition appears in the panel
- **WHEN** the user assigns wells to a new condition `Pao1 api`
- **THEN** `Pao1 api` appears in the panel with its plate color and an empty dilution field showing the default as placeholder

#### Scenario: Set a condition's dilution
- **WHEN** the user enters `1:100` in the dilution field of `Pao1 api`
- **THEN** `Pao1 api` results use factor 100 and other conditions keep their dilutions

### Requirement: Dilutions are remembered by condition name
A condition's dilution SHALL be kept while the condition has no assigned wells and SHALL apply again when wells are assigned to the same name in the same session.

#### Scenario: Re-assign a cleared condition
- **WHEN** `Pao1 api` has dilution 1:100, the user clears all its wells, then assigns wells to `Pao1 api` again
- **THEN** `Pao1 api` shows and uses dilution 1:100

### Requirement: Templates store per-condition dilutions
Saved templates SHALL include the default dilution and the dilution of each condition assigned in the template. Templates saved without per-condition dilutions SHALL load with every condition using the default dilution.

#### Scenario: Template keeps per-condition dilutions
- **WHEN** the user saves a template while `Pao1 api` has dilution 1:100 and the default is 1:500, then applies it to a new plate
- **THEN** `Pao1 api` uses 1:100 and the default is 1:500

#### Scenario: Template from before per-condition dilutions
- **WHEN** the user imports a template file that has a dilution of 500 and no per-condition dilutions
- **THEN** the default dilution becomes 1:500 and no condition has its own dilution

## MODIFIED Requirements

### Requirement: Warn about near-duplicate condition names
Condition names SHALL be kept exactly as typed. When two names are equal ignoring letter case and repeated whitespace, the system SHALL show a warning and offer to merge one into the other; it SHALL NOT merge them automatically. On merge, the kept name SHALL keep its own dilution if set, otherwise take the merged name's dilution. When both names have different dilutions, the merge offer SHALL show both values and which one is kept.

#### Scenario: Case difference
- **WHEN** conditions `E+s+p api` and `E+S+P api` both exist
- **THEN** the system warns that they may be the same condition and offers to merge them

#### Scenario: User merges names
- **WHEN** the user accepts merging `E+S+P api` into `E+s+p api`
- **THEN** all wells previously assigned `E+S+P api` are assigned `E+s+p api` with their biological replicate numbers unchanged

#### Scenario: Merge with different dilutions
- **WHEN** `E+s+p api` has dilution 1:500, `E+S+P api` has dilution 1:250, and the user is offered to merge `E+S+P api` into `E+s+p api`
- **THEN** the offer states that 1:500 is kept and 1:250 is discarded, and after merging `E+s+p api` uses 1:500

#### Scenario: Merge inherits a dilution
- **WHEN** `E+S+P api` has dilution 1:250, `E+s+p api` has none, and the user merges `E+S+P api` into `E+s+p api`
- **THEN** `E+s+p api` uses dilution 1:250
