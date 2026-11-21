import type { Assignment, Plate, Settings, Unit, WellId } from './types';
import { parseWellId } from './types';

export interface ReplicateGroup {
  condition: string;
  bio: number;
  /** Wells in plate order (row, then column). */
  wells: WellId[];
}

export interface GroupResult extends ReplicateGroup {
  /** Values of all wells (null for missing). */
  values: (number | null)[];
  excludedWells: WellId[];
  /** Mean of usable wells, null if none are usable. */
  technicalMean: number | null;
  /** technicalMean x dilution x unit factor, null if technicalMean is null. */
  value: number | null;
}

export interface ConditionResult {
  condition: string;
  /** bio number -> value (null if the group yielded no value). Absent if not assigned. */
  bioValues: Map<number, number | null>;
  n: number;
  mean: number | null;
  sd: number | null;
  sem: number | null;
}

export interface Results {
  groups: GroupResult[];
  conditions: ConditionResult[];
  /** Sorted union of bio numbers used by any condition. */
  bioNumbers: number[];
}

function compareWells(a: WellId, b: WellId): number {
  const pa = parseWellId(a);
  const pb = parseWellId(b);
  return pa.row - pb.row || pa.col - pb.col;
}

/** Groups assigned wells into technical-replicate groups keyed by (condition, bio). */
export function groupWells(assignment: Assignment): ReplicateGroup[] {
  const map = new Map<string, ReplicateGroup>();
  for (const [well, a] of Object.entries(assignment)) {
    const key = `${a.condition}\u0000${a.bio}`;
    let g = map.get(key);
    if (!g) {
      g = { condition: a.condition, bio: a.bio, wells: [] };
      map.set(key, g);
    }
    g.wells.push(well);
  }
  const groups = [...map.values()];
  for (const g of groups) g.wells.sort(compareWells);
  return groups;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Sample standard deviation (n-1); null when fewer than 2 values. */
export function sampleSd(values: number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values)!;
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1));
}

/** Mean of a group's wells, ignoring excluded and missing wells. */
export function technicalMean(
  plate: Plate,
  wells: WellId[],
  excluded: ReadonlySet<WellId>,
): number | null {
  const usable: number[] = [];
  for (const w of wells) {
    if (excluded.has(w)) continue;
    const { row, col } = parseWellId(w);
    const v = plate[row][col].value;
    if (v !== null) usable.push(v);
  }
  return mean(usable);
}

const UNIT_EXPONENT: Record<Unit, number> = { 'pg/ml': 0, 'ng/ml': 1, 'ug/ml': 2 };

/** Factor that converts a value in `from` into `to`. */
export function unitFactor(from: Unit, to: Unit): number {
  return 1000 ** (UNIT_EXPONENT[from] - UNIT_EXPONENT[to]);
}

/** Parses a dilution factor; returns null unless it is a finite number > 0. */
export function parseDilution(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function summarize(values: number[]): Pick<ConditionResult, 'n' | 'mean' | 'sd' | 'sem'> {
  const sd = sampleSd(values);
  return {
    n: values.length,
    mean: mean(values),
    sd,
    sem: sd === null ? null : sd / Math.sqrt(values.length),
  };
}

/**
 * Computes all results. Conditions are returned in `order`; conditions present in the
 * assignment but missing from `order` are appended in first-seen order.
 */
export function computeResults(
  plate: Plate,
  assignment: Assignment,
  excluded: ReadonlySet<WellId>,
  settings: Settings,
  order: string[] = [],
): Results {
  const factor = settings.dilution * unitFactor(settings.inputUnit, settings.outputUnit);
  const groups: GroupResult[] = groupWells(assignment).map((g) => {
    const tm = technicalMean(plate, g.wells, excluded);
    return {
      ...g,
      values: g.wells.map((w) => {
        const { row, col } = parseWellId(w);
        return plate[row][col].value;
      }),
      excludedWells: g.wells.filter((w) => excluded.has(w)),
      technicalMean: tm,
      value: tm === null ? null : tm * factor,
    };
  });

  const names: string[] = order.filter((c) => groups.some((g) => g.condition === c));
  for (const g of groups) if (!names.includes(g.condition)) names.push(g.condition);

  const conditions: ConditionResult[] = names.map((condition) => {
    const own = groups.filter((g) => g.condition === condition).sort((a, b) => a.bio - b.bio);
    const bioValues = new Map<number, number | null>(own.map((g) => [g.bio, g.value]));
    const present = own.map((g) => g.value).filter((v): v is number => v !== null);
    return { condition, bioValues, ...summarize(present) };
  });

  const bioNumbers = [...new Set(groups.map((g) => g.bio))].sort((a, b) => a - b);
  return { groups, conditions, bioNumbers };
}
