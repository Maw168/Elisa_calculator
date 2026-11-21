import type { Results } from '../core/calc';
import type { Unit } from '../core/types';

interface Props {
  results: Results;
  unit: Unit;
  onMove: (condition: string, delta: number) => void;
}

export function fmt(v: number | null | undefined, decimals = 2): string {
  return v == null ? '' : v.toFixed(decimals);
}

export function ResultsTable({ results, unit, onMove }: Props) {
  const { conditions, bioNumbers } = results;
  if (conditions.length === 0) return <p className="hint">Assign wells to see results.</p>;
  const last = conditions.length - 1;
  return (
    <div className="table-wrap">
      <table className="results" aria-label={`Results in ${unit}`}>
        <thead>
          <tr>
            <th className="unit">{unit}</th>
            {conditions.map((c, i) => (
              <th key={c.condition}>
                <div className="col-head">
                  <button onClick={() => onMove(c.condition, -1)} disabled={i === 0} aria-label={`Move ${c.condition} left`}>
                    ‹
                  </button>
                  <span>{c.condition}</span>
                  <button onClick={() => onMove(c.condition, 1)} disabled={i === last} aria-label={`Move ${c.condition} right`}>
                    ›
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bioNumbers.map((bio) => (
            <tr key={bio}>
              <th>bio {bio}</th>
              {conditions.map((c) => (
                <td key={c.condition}>{fmt(c.bioValues.get(bio))}</td>
              ))}
            </tr>
          ))}
          <tr className="summary first">
            <th>Mean</th>
            {conditions.map((c) => (
              <td key={c.condition}>{fmt(c.mean)}</td>
            ))}
          </tr>
          <tr className="summary">
            <th>SD</th>
            {conditions.map((c) => (
              <td key={c.condition}>{fmt(c.sd)}</td>
            ))}
          </tr>
          <tr className="summary">
            <th>SEM</th>
            {conditions.map((c) => (
              <td key={c.condition}>{fmt(c.sem)}</td>
            ))}
          </tr>
          <tr className="summary">
            <th>n</th>
            {conditions.map((c) => (
              <td key={c.condition}>{c.n}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
