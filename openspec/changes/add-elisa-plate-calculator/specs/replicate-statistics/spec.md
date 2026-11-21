# Spec Delta

## Purpose

Turns assigned plate wells into one value per biological replicate (technical-replicate mean, dilution, unit conversion) and summarizes each condition with mean, SD, SEM and n, recalculating whenever inputs change.

## ADDED Requirements

### Requirement: Technical-replicate mean
For each technical-replicate group the system SHALL compute the arithmetic mean of its wells, ignoring wells that are excluded or missing.

#### Scenario: Three valid wells
- **WHEN** A3:A5 (372.19, 342.31, 383.12) are `E+s+p api` bio 1 with dilution 1 and output unit pg/ml
- **THEN** the biological-replicate value is 365.87 pg/ml (to 2 decimals)

#### Scenario: One excluded well
- **WHEN** G6:G8 (189.97, 374.99, 357.33) are `Pao1 api` bio 2 and G6 is excluded
- **THEN** the technical mean is 366.16 pg/ml

### Requirement: Groups with no usable wells
A technical-replicate group whose wells are all excluded or missing SHALL yield no value for that biological replicate; it SHALL NOT be treated as zero.

#### Scenario: All wells missing
- **WHEN** every well of a group is `NoCalc` or excluded
- **THEN** that biological replicate shows as empty and is not counted in n

### Requirement: Dilution factor and unit conversion
The biological-replicate value SHALL equal the technical mean multiplied by a user-set positive dilution factor and converted from the input unit to the output unit, chosen from pg/ml, ng/ml and ug/ml. Defaults SHALL be dilution 1, input pg/ml, output pg/ml.

#### Scenario: Reproduce the reference workbook
- **WHEN** A3:A5 are `E+s+p api` bio 1, dilution is 500, input unit pg/ml and output unit ng/ml
- **THEN** the biological-replicate value is 182.94 ng/ml, matching cell D48 of the reference workbook

#### Scenario: Invalid dilution
- **WHEN** the user enters 0, a negative number or text as dilution factor
- **THEN** the field shows an error and results keep using the last valid dilution

### Requirement: Per-condition summary statistics
For each condition the system SHALL report n (number of biological replicates with a value), mean, sample standard deviation (n-1 denominator) and SEM (SD divided by the square root of n). SD and SEM SHALL be empty when n is less than 2.

#### Scenario: Three biological replicates
- **WHEN** A3:C5 are assigned `E+s+p api` with rows A, B, C as bio 1, 2, 3, dilution 500 and output unit ng/ml
- **THEN** the biological-replicate values are 182.94, 183.24 and 190.56, and n is 3, mean is 185.58, SD is 4.32 and SEM is 2.49 (to 2 decimals)

#### Scenario: Single biological replicate
- **WHEN** a condition has a value for only one biological replicate
- **THEN** n is 1, mean equals that value, and SD and SEM are empty

### Requirement: Live recalculation
Results SHALL update immediately after any change to plate values, assignments, exclusions, dilution or units, without a separate calculate action.

#### Scenario: Excluding a well updates results
- **WHEN** the user excludes a well that belongs to an assigned group
- **THEN** the affected biological-replicate value, condition statistics, table and chart update without further action
