import { useState } from 'react';
import type { WellId } from '../core/types';
import { formatDilution } from '../core/calc';

interface Props {
  selection: ReadonlySet<WellId>;
  excluded: ReadonlySet<WellId>;
  conditions: string[];
  nearDuplicates: string[][];
  onApply: (condition: string, bio: number) => void;
  onClear: () => void;
  onExclude: (exclude: boolean) => void;
  /** Per-condition dilutions, to show conflicts in the merge offer. */
  dilutions: Record<string, number>;
  /** Merges every name in `froms` into `to`. */
  onMerge: (froms: string[], to: string) => void;
}

export function AssignPanel({
  selection,
  excluded,
  conditions,
  nearDuplicates,
  onApply,
  onClear,
  onExclude,
  dilutions,
  onMerge,
}: Props) {
  const [condition, setCondition] = useState('');
  const [bioText, setBioText] = useState('1');
  const [error, setError] = useState<string | null>(null);

  const count = selection.size;
  const anyExcluded = [...selection].some((w) => excluded.has(w));
  const allExcluded = count > 0 && [...selection].every((w) => excluded.has(w));

  function apply() {
    const name = condition.trim();
    const bio = Number(bioText);
    if (name === '') return setError('Enter a condition name.');
    if (!Number.isInteger(bio) || bio < 1) return setError('Bio replicate must be a whole number ≥ 1.');
    setError(null);
    onApply(name, bio);
  }

  return (
    <div className="assign-panel">
      <p className="hint">
        {count === 0
          ? 'Drag over wells to select them (Shift/Cmd adds). Click a row letter or column number to select a line. Double-click a well to exclude/restore it.'
          : `${count} well${count > 1 ? 's' : ''} selected`}
      </p>
      <label htmlFor="cond">Condition</label>
      <input
        id="cond"
        list="cond-list"
        value={condition}
        onChange={(e) => {
          setCondition(e.target.value);
          setError(null);
        }}
        placeholder="e.g. E+s+p api"
        onKeyDown={(e) => e.key === 'Enter' && count > 0 && apply()}
      />
      <datalist id="cond-list">
        {conditions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <label htmlFor="bio">Biological replicate #</label>
      <input
        id="bio"
        type="number"
        min={1}
        step={1}
        value={bioText}
        onChange={(e) => {
          setBioText(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => e.key === 'Enter' && count > 0 && apply()}
      />
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="primary" onClick={apply} disabled={count === 0}>
          Apply
        </button>
        <button onClick={onClear} disabled={count === 0}>
          Clear
        </button>
      </div>
      <div className="row">
        <button onClick={() => onExclude(true)} disabled={count === 0 || allExcluded}>
          Exclude
        </button>
        <button onClick={() => onExclude(false)} disabled={!anyExcluded}>
          Restore
        </button>
      </div>
      {nearDuplicates.map((group) => {
        const withOwn = group.filter((g) => dilutions[g] !== undefined);
        const differ = new Set(withOwn.map((g) => dilutions[g])).size > 1;
        return (
          <div key={group.join('|')} className="warning" role="status">
            <p>These names may be the same condition: {group.map((g) => `“${g}”`).join(', ')}</p>
            {differ && (
              <p>
                Their dilutions differ: {withOwn.map((g) => `“${g}” ${formatDilution(dilutions[g])}`).join(', ')}.
              </p>
            )}
            {group.map((target) => {
              const froms = group.filter((g) => g !== target);
              // The kept name keeps its own dilution; otherwise it inherits the first merged name's.
              const kept = dilutions[target] ?? froms.map((f) => dilutions[f]).find((d) => d !== undefined);
              const discarded = [...new Set(froms.map((f) => dilutions[f]).filter((d) => d !== undefined && d !== kept))];
              return (
                <button key={target} onClick={() => onMerge(froms, target)}>
                  Merge into “{target}”
                  {differ && kept !== undefined && (
                    <>
                      {' '}
                      (keeps {formatDilution(kept)}
                      {discarded.length > 0 && `, discards ${discarded.map((d) => formatDilution(d!)).join(', ')}`})
                    </>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
