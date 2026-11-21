import type { Assignment, Settings } from './types';
import { DEFAULT_SETTINGS, UNITS, parseWellId } from './types';

export interface Template {
  name: string;
  assignment: Assignment;
  settings: Settings;
  conditionOrder: string[];
}

export const STORAGE_KEY = 'elisa-calculator.templates.v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isValidAssignment(x: unknown): x is Assignment {
  if (!x || typeof x !== 'object') return false;
  return Object.entries(x as Record<string, unknown>).every(([w, a]) => {
    try {
      parseWellId(w);
    } catch {
      return false;
    }
    const v = a as { condition?: unknown; bio?: unknown };
    return typeof v?.condition === 'string' && Number.isInteger(v.bio) && (v.bio as number) > 0;
  });
}

function toSettings(x: unknown): Settings {
  const s = (x ?? {}) as Partial<Settings>;
  return {
    dilution: typeof s.dilution === 'number' && s.dilution > 0 ? s.dilution : DEFAULT_SETTINGS.dilution,
    inputUnit: UNITS.includes(s.inputUnit!) ? s.inputUnit! : DEFAULT_SETTINGS.inputUnit,
    outputUnit: UNITS.includes(s.outputUnit!) ? s.outputUnit! : DEFAULT_SETTINGS.outputUnit,
    errorBar: s.errorBar === 'SEM' ? 'SEM' : 'SD',
  };
}

/** Validates parsed JSON into a list of templates; throws on invalid input. */
export function parseTemplates(json: unknown): Template[] {
  const list = Array.isArray(json) ? json : [json];
  return list.map((t, i) => {
    const o = t as Partial<Template>;
    if (typeof o?.name !== 'string' || o.name.trim() === '' || !isValidAssignment(o.assignment)) {
      throw new Error(`Template ${i + 1} is not valid.`);
    }
    return {
      name: o.name,
      assignment: o.assignment,
      settings: toSettings(o.settings),
      conditionOrder: Array.isArray(o.conditionOrder) ? o.conditionOrder.filter((c) => typeof c === 'string') : [],
    };
  });
}

export function loadTemplates(storage: StorageLike | null): { templates: Template[]; available: boolean } {
  if (!storage) return { templates: [], available: false };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { templates: [], available: true };
    try {
      return { templates: parseTemplates(JSON.parse(raw)), available: true };
    } catch {
      return { templates: [], available: true };
    }
  } catch {
    return { templates: [], available: false };
  }
}

/** Saves templates; returns false if storage is unavailable. */
export function saveTemplates(storage: StorageLike | null, templates: Template[]): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(templates));
    return true;
  } catch {
    return false;
  }
}

/** Adds or replaces (by name) a template. */
export function upsertTemplate(templates: Template[], t: Template): Template[] {
  return [...templates.filter((x) => x.name !== t.name), t];
}

export function getBrowserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
