import { useCallback, useMemo, useRef, useState } from 'react';
import type { Plate, Settings, Unit, WellId } from './core/types';
import { DEFAULT_SETTINGS, UNITS, emptyPlate } from './core/types';
import {
  assignWells,
  clearWells,
  conditionNames,
  findNearDuplicates,
  mergeCondition,
  mergeDilutions,
  moveCondition,
  reconcileOrder,
} from './core/assignment';
import { computeResults } from './core/calc';
import { colorFor } from './core/colors';
import { buildWorkbook, downloadWorkbook, hasExportableResults, prismText } from './core/export';
import type { Assignment } from './core/types';
import {
  getBrowserStorage,
  loadTemplates,
  saveTemplates,
  templateSettings,
  upsertTemplate,
  type Template,
} from './core/templates';
import { PlateInput } from './components/PlateInput';
import { PlateGrid } from './components/PlateGrid';
import { AssignPanel } from './components/AssignPanel';
import { ConditionsPanel } from './components/ConditionsPanel';
import { TemplatesPanel } from './components/TemplatesPanel';
import { ResultsTable } from './components/ResultsTable';
import { ResultsChart } from './components/ResultsChart';

function baseName(source: string): string {
  return source === 'pasted' || source === '' ? 'elisa' : source.replace(/\.[^.]+$/, '');
}

export default function App() {
  const storage = useMemo(() => getBrowserStorage(), []);
  const initialTemplates = useMemo(() => loadTemplates(storage), [storage]);

  const [plate, setPlate] = useState<Plate>(emptyPlate);
  const [source, setSource] = useState('');
  const [assignment, setAssignment] = useState<Assignment>({});
  const [excluded, setExcluded] = useState<Set<WellId>>(new Set());
  const [order, setOrder] = useState<string[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  // Bumped when a template replaces the settings, so the conditions panel drops any half-typed text.
  const [dilutionResetKey, setDilutionResetKey] = useState(0);
  const [selection, setSelection] = useState<Set<WellId>>(new Set());
  const [colorKeys, setColorKeys] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Template[]>(initialTemplates.templates);
  const [storageAvailable, setStorageAvailable] = useState(initialTemplates.available);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const results = useMemo(
    () => computeResults(plate, assignment, excluded, settings, order),
    [plate, assignment, excluded, settings, order],
  );
  const conditions = useMemo(() => conditionNames(assignment), [assignment]);
  const nearDuplicates = useMemo(() => findNearDuplicates(conditions), [conditions]);
  const exportable = hasExportableResults(results);
  const orderedConditions = useMemo(() => results.conditions.map((c) => c.condition), [results]);

  // Colors follow the condition (first-seen order), not its current position, so reordering never repaints.
  const colorOf = useCallback((condition: string) => colorFor(colorKeys, condition), [colorKeys]);

  function rememberColors(names: string[]) {
    setColorKeys((k) => [...k, ...names.filter((n, i) => !k.includes(n) && names.indexOf(n) === i)]);
  }

  function updateAssignment(next: Assignment, newlyAssigned: string[] = []) {
    setAssignment(next);
    setOrder((o) => reconcileOrder(o, next, newlyAssigned));
    rememberColors([...newlyAssigned, ...conditionNames(next)]);
  }

  function persist(next: Template[]) {
    setTemplates(next);
    setStorageAvailable(saveTemplates(storage, next));
  }

  function setUnit(key: 'inputUnit' | 'outputUnit', unit: Unit) {
    setSettings((s) => ({ ...s, [key]: unit }));
  }

  async function copyForPrism() {
    const text = prismText(results);
    try {
      await navigator.clipboard.writeText(text);
      setFallbackText(null);
      setCopyStatus('Copied. Paste into the first cell of a Prism Column data table.');
    } catch {
      setCopyStatus(null);
      setFallbackText(text);
    }
  }

  async function exportExcel() {
    setExportError(null);
    try {
      const bytes = await buildWorkbook({
        plate,
        assignment,
        excluded,
        settings,
        results,
        colorOf,
        source,
        exportedAt: new Date(),
      });
      downloadWorkbook(bytes, `${baseName(source)}_results.xlsx`);
    } catch (e) {
      setExportError(`Excel export failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${baseName(source)}_chart.png`;
    a.click();
  }

  return (
    <main>
      <header>
        <h1>ELISA plate calculator</h1>
        <p className="hint">Runs entirely in your browser; your data is not uploaded anywhere.</p>
      </header>

      <PlateInput
        onLoad={(p, name) => {
          setPlate(p);
          setSource(name);
          setSelection(new Set());
        }}
      />

      <section className="card">
        <h2>2. Assign wells{source && <span className="source"> · {source === 'pasted' ? 'pasted data' : source}</span>}</h2>
        <div className="assign-layout">
          <PlateGrid
            plate={plate}
            assignment={assignment}
            excluded={excluded}
            selection={selection}
            colorOf={colorOf}
            onSelectionChange={setSelection}
            onToggleExclude={(w) =>
              setExcluded((ex) => {
                const next = new Set(ex);
                if (next.has(w)) next.delete(w);
                else next.add(w);
                return next;
              })
            }
          />
          <div className="side">
            <AssignPanel
              selection={selection}
              excluded={excluded}
              conditions={conditions}
              nearDuplicates={nearDuplicates}
              onApply={(condition, bio) => updateAssignment(assignWells(assignment, [...selection], condition, bio), [condition])}
              onClear={() => updateAssignment(clearWells(assignment, [...selection]))}
              onExclude={(exclude) =>
                setExcluded((ex) => {
                  const next = new Set(ex);
                  for (const w of selection) {
                    if (exclude) next.add(w);
                    else next.delete(w);
                  }
                  return next;
                })
              }
              dilutions={settings.dilutions}
              onMerge={(froms, to) => {
                updateAssignment(froms.reduce((a, from) => mergeCondition(a, from, to), assignment));
                setSettings((s) => ({
                  ...s,
                  dilutions: froms.reduce((d, from) => mergeDilutions(d, from, to).dilutions, s.dilutions),
                }));
              }}
            />
            <ConditionsPanel
              key={dilutionResetKey}
              conditions={orderedConditions}
              colorOf={colorOf}
              defaultDilution={settings.dilution}
              dilutions={settings.dilutions}
              onDefaultChange={(d) => setSettings((s) => ({ ...s, dilution: d }))}
              onConditionChange={(c, d) =>
                setSettings((s) => {
                  const dilutions = { ...s.dilutions };
                  if (d === null) delete dilutions[c];
                  else dilutions[c] = d;
                  return { ...s, dilutions };
                })
              }
            />
            <TemplatesPanel
              templates={templates}
              storageAvailable={storageAvailable}
              canSave={Object.keys(assignment).length > 0}
              onSave={(name) =>
                persist(
                  upsertTemplate(templates, {
                    name,
                    assignment,
                    settings: templateSettings(settings, assignment),
                    conditionOrder: order,
                  }),
                )
              }
              onApply={(t) => {
                const nextOrder = reconcileOrder(t.conditionOrder, t.assignment);
                setAssignment(t.assignment);
                setOrder(nextOrder);
                rememberColors(nextOrder);
                setSettings(t.settings);
                setDilutionResetKey((k) => k + 1);
              }}
              onDelete={(name) => persist(templates.filter((t) => t.name !== name))}
              onImport={(list) => persist(list.reduce(upsertTemplate, templates))}
            />
          </div>
        </div>
      </section>

      <section className="card">
        <h2>3. Results</h2>
        <div className="settings">
          <label>
            Input unit
            <select value={settings.inputUnit} onChange={(e) => setUnit('inputUnit', e.target.value as Unit)}>
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
          <label>
            Output unit
            <select value={settings.outputUnit} onChange={(e) => setUnit('outputUnit', e.target.value as Unit)}>
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
          <fieldset className="toggle">
            <legend>Error bar</legend>
            {(['SD', 'SEM'] as const).map((e) => (
              <label key={e}>
                <input
                  type="radio"
                  name="errorBar"
                  checked={settings.errorBar === e}
                  onChange={() => setSettings((s) => ({ ...s, errorBar: e }))}
                />
                {e}
              </label>
            ))}
          </fieldset>
        </div>

        <ResultsTable results={results} unit={settings.outputUnit} onMove={(c, d) => setOrder((o) => moveCondition(o, c, d))} />

        <div className="row exports">
          <button
            className="primary"
            disabled={!exportable}
            onClick={() => void exportExcel()}
          >
            Download Excel
          </button>
          <button disabled={!exportable} onClick={() => void copyForPrism()}>
            Copy for Prism
          </button>
          <button disabled={!exportable} onClick={downloadPng}>
            Download PNG
          </button>
          {copyStatus && <span className="hint">{copyStatus}</span>}
        </div>
        {exportError && <p className="error">{exportError}</p>}
        {fallbackText !== null && (
          <div className="fallback">
            <p className="warning">The browser blocked clipboard access. Select the text below and copy it (Cmd/Ctrl+C):</p>
            <textarea readOnly rows={Math.min(10, fallbackText.split('\n').length + 1)} value={fallbackText} onFocus={(e) => e.target.select()} />
          </div>
        )}

        <ResultsChart
          conditions={results.conditions}
          colorOf={colorOf}
          errorBar={settings.errorBar}
          unit={settings.outputUnit}
          canvasRef={canvasRef}
        />
      </section>
    </main>
  );
}
