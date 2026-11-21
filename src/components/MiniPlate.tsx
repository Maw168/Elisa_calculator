import type { Plate } from '../core/types';

/** Compact read-only preview of a plate block. */
export function MiniPlate({ plate }: { plate: Plate }) {
  return (
    <table className="mini-plate">
      <tbody>
        {plate.map((row, r) => (
          <tr key={r}>
            {row.map((c, j) => (
              <td key={j} className={c.value === null ? 'missing' : ''}>
                {c.value === null ? c.text : Number(c.value.toPrecision(4))}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
