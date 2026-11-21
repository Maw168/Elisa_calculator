import { useEffect, useRef } from 'react';
import type { Assignment, Plate, WellId } from '../core/types';
import { COLS, ROWS, wellId } from '../core/types';
import { rectWells } from '../core/assignment';

interface Props {
  plate: Plate;
  assignment: Assignment;
  excluded: ReadonlySet<WellId>;
  selection: ReadonlySet<WellId>;
  colorOf: (condition: string) => string;
  onSelectionChange: (wells: Set<WellId>) => void;
  onToggleExclude: (well: WellId) => void;
}

interface Drag {
  anchor: { row: number; col: number };
  base: Set<WellId>;
}

export function PlateGrid({
  plate,
  assignment,
  excluded,
  selection,
  colorOf,
  onSelectionChange,
  onToggleExclude,
}: Props) {
  const drag = useRef<Drag | null>(null);

  useEffect(() => {
    const end = () => {
      drag.current = null;
    };
    window.addEventListener('mouseup', end);
    return () => window.removeEventListener('mouseup', end);
  }, []);

  function update(to: { row: number; col: number }) {
    const d = drag.current;
    if (!d) return;
    onSelectionChange(new Set([...d.base, ...rectWells(d.anchor, to)]));
  }

  function selectLine(wells: WellId[], additive: boolean) {
    onSelectionChange(new Set([...(additive ? selection : []), ...wells]));
  }

  return (
    <table className="plate" aria-label="Plate layout">
      <thead>
        <tr>
          <th />
          {COLS.map((c, j) => (
            <th
              key={c}
              className="clickable"
              title={`Select column ${c}`}
              onClick={(e) => selectLine(ROWS.map((_, r) => wellId(r, j)), e.shiftKey || e.metaKey || e.ctrlKey)}
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ROWS.map((letter, r) => (
          <tr key={letter}>
            <th
              className="clickable"
              title={`Select row ${letter}`}
              onClick={(e) => selectLine(COLS.map((_, j) => wellId(r, j)), e.shiftKey || e.metaKey || e.ctrlKey)}
            >
              {letter}
            </th>
            {COLS.map((_, c) => {
              const id = wellId(r, c);
              const cell = plate[r][c];
              const a = assignment[id];
              const isExcluded = excluded.has(id);
              const classes = ['well'];
              if (selection.has(id)) classes.push('selected');
              if (isExcluded) classes.push('excluded');
              if (cell.value === null) classes.push('missing');
              return (
                <td
                  key={id}
                  className={classes.join(' ')}
                  style={a ? { background: colorOf(a.condition) } : undefined}
                  title={`${id}${a ? ` · ${a.condition} · bio ${a.bio}` : ''}${isExcluded ? ' · excluded' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
                    drag.current = { anchor: { row: r, col: c }, base: new Set(additive ? selection : []) };
                    update({ row: r, col: c });
                  }}
                  onMouseEnter={() => update({ row: r, col: c })}
                  onDoubleClick={() => onToggleExclude(id)}
                >
                  <span className="value">{cell.value === null ? cell.text : cell.value}</span>
                  {a && <span className="badge">{a.bio}</span>}
                  {a && <span className="cond">{a.condition}</span>}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
