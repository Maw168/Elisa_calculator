# Spec Delta

## MODIFIED Requirements

### Requirement: Dilution factor and unit conversion
The biological-replicate value SHALL equal the technical mean multiplied by the dilution factor of its condition and converted from the input unit to the output unit, chosen from pg/ml, ng/ml and ug/ml. A condition's dilution factor SHALL be its own dilution when set, otherwise the default dilution. Defaults SHALL be default dilution 1, input pg/ml, output pg/ml.

#### Scenario: Reproduce the reference workbook
- **WHEN** A3:A5 are `E+s+p api` bio 1, the default dilution is 1:500, `E+s+p api` has no own dilution, input unit pg/ml and output unit ng/ml
- **THEN** the biological-replicate value is 182.94 ng/ml, matching cell D48 of the reference workbook

#### Scenario: Conditions with different dilutions
- **WHEN** A3:A5 are `E+s+p api` bio 1 with dilution 1:500, G3:G5 are `Pao1 api` bio 1 with dilution 1:100, and the output unit equals the input unit
- **THEN** the `E+s+p api` bio 1 value is its technical mean x 500 and the `Pao1 api` bio 1 value is its technical mean x 100

#### Scenario: Condition falls back to the default
- **WHEN** the default dilution is 1:200 and a condition has no own dilution
- **THEN** that condition's values use factor 200

#### Scenario: Invalid dilution
- **WHEN** the user enters 0, a negative number or text as the default dilution or a condition's dilution
- **THEN** the field shows an error and results keep using the last valid dilution for that field

## ADDED Requirements

### Requirement: Dilution notation
Dilutions SHALL be entered and displayed as `1:x`, where x is the factor applied. A bare number x SHALL be accepted as `1:x`. Spaces around the colon SHALL be allowed.

#### Scenario: Ratio notation
- **WHEN** the user enters `1:500`
- **THEN** the factor 500 is used and the field shows `1:500`

#### Scenario: Bare number shorthand
- **WHEN** the user enters `500`
- **THEN** the factor 500 is used and the field shows `1:500` once it loses focus

#### Scenario: Clearing a condition's dilution
- **WHEN** the user empties the dilution field of a condition
- **THEN** that condition uses the default dilution again and no error is shown
