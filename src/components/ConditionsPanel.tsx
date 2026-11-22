import { useState } from 'react';
import { formatDilution, parseDilution } from '../core/calc';

interface Props {
  /** Assigned conditions in the shared condition order. */
  conditions: string[];
  colorOf: (condition: string) => string;
  defaultDilution: number;
  dilutions: Record<string, number>;
  onDefaultChange: (dilution: number) => void;
  /** null removes the condition's own dilution (falls back to the default). */
  onConditionChange: (condition: string, dilution: number | null) => void;
}

const DEFAULT_KEY = '\u0000default';

/**
 * Lists assigned conditions with their color and dilution (entered as 1:x), plus the default dilution.
 * Text being edited is kept per field so an invalid entry stays visible while the last valid value is used.
 */
export function ConditionsPanel({
  conditions,
  colorOf,
  defaultDilution,
  dilutions,
  onDefaultChange,
  onConditionChange,
}: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function setDraft(key: string, text: string | null) {
    setDrafts((d) => {
      const next = { ...d };
      if (text === null) delete next[key];
      else next[key] = text;
      return next;
    });
  }

  function isInvalid(key: string): boolean {
    const text = drafts[key];
    if (text === undefined) return false;
    if (key !== DEFAULT_KEY && text.trim() === '') return false;
    return parseDilution(text) === null;
  }

  function change(key: string, text: string) {
    setDraft(key, text);
    const d = parseDilution(text);
    if (key === DEFAULT_KEY) {
      if (d !== null) onDefaultChange(d);
    } else if (text.trim() === '') {
      onConditionChange(key, null);
    } else if (d !== null) {
      onConditionChange(key, d);
    }
  }

  /** On blur, valid text is replaced by its formatted value; invalid text stays to show the error. */
  function blur(key: string) {
    if (!isInvalid(key)) setDraft(key, null);
  }

  const invalidNames = conditions.filter(isInvalid);
  const defaultInvalid = isInvalid(DEFAULT_KEY);
  const defaultText = formatDilution(defaultDilution);

  return (
    <div className="conditions-panel">
      <h3>Conditions &amp; dilution</h3>
      {conditions.length === 0 ? (
        <p className="hint">Assigned conditions appear here so you can set each one's dilution.</p>
      ) : (
        <ul className="condition-list">
          {conditions.map((c) => {
            const own = dilutions[c];
            return (
              <li key={c}>
                <span className="swatch" style={{ background: colorOf(c) }} aria-hidden />
                <span className="name" title={c}>
                  {c}
                </span>
                <input
                  aria-label={`Dilution of ${c}`}
                  className={isInvalid(c) ? 'invalid' : ''}
                  value={drafts[c] ?? (own === undefined ? '' : formatDilution(own))}
                  placeholder={defaultText}
                  onChange={(e) => change(c, e.target.value)}
                  onBlur={() => blur(c)}
                />
              </li>
            );
          })}
        </ul>
      )}
      <div className="condition-default">
        <span className="name">Default</span>
        <input
          aria-label="Default dilution"
          className={defaultInvalid ? 'invalid' : ''}
          value={drafts[DEFAULT_KEY] ?? defaultText}
          onChange={(e) => change(DEFAULT_KEY, e.target.value)}
          onBlur={() => blur(DEFAULT_KEY)}
        />
      </div>
      <p className="hint">Enter as 1:500 (or just 500). Empty uses the default.</p>
      {invalidNames.map((c) => (
        <p key={c} className="error">
          Dilution of “{c}” must be like 1:500 with a number greater than 0. Using{' '}
          {dilutions[c] === undefined ? `the default (${defaultText})` : formatDilution(dilutions[c])}.
        </p>
      ))}
      {defaultInvalid && (
        <p className="error">
          Default dilution must be like 1:500 with a number greater than 0. Using the last valid value ({defaultText}).
        </p>
      )}
    </div>
  );
}
