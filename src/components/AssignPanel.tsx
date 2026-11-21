import { useState } from 'react';
import type { WellId } from '../core/types';

interface Props {
  selection: ReadonlySet<WellId>;
  excluded: ReadonlySet<WellId>;
  conditions: string[];
  nearDuplicates: string[][];
  onApply: (condition: string, bio: number) => void;
  onClear: () => void;
  onExclude: (exclude: boolean) => void;
  onMerge: (from: string, to: string) => void;
}

export function AssignPanel({
  selection,
  excluded,
  conditions,
  nearDuplicates,
  onApply,
  onClear,
  onExclude,
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
      {nearDuplicates.map((group) => (
        <div key={group.join('|')} className="warning" role="status">
          <p>These names may be the same condition: {group.map((g) => `“${g}”`).join(', ')}</p>
          {group.map((target) => (
            <button
              key={target}
              onClick={() => group.filter((g) => g !== target).forEach((from) => onMerge(from, target))}
            >
              Merge into “{target}”
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
