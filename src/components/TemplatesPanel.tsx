import { useState } from 'react';
import type { Template } from '../core/templates';
import { parseTemplates } from '../core/templates';

interface Props {
  templates: Template[];
  storageAvailable: boolean;
  canSave: boolean;
  onSave: (name: string) => void;
  onApply: (t: Template) => void;
  onDelete: (name: string) => void;
  onImport: (templates: Template[]) => void;
}

function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function TemplatesPanel({ templates, storageAvailable, canSave, onSave, onApply, onDelete, onImport }: Props) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="templates">
      <h3>Layout templates</h3>
      {!storageAvailable && (
        <p className="warning">
          Browser storage is unavailable, so templates will not be remembered after you close the page. Use “Export
          templates” to keep them in a file.
        </p>
      )}
      <div className="row">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" />
        <button
          disabled={!canSave || name.trim() === ''}
          onClick={() => {
            onSave(name.trim());
            setMessage(`Saved “${name.trim()}”.`);
            setName('');
          }}
        >
          Save
        </button>
      </div>
      {templates.length > 0 && (
        <ul className="template-list">
          {templates.map((t) => (
            <li key={t.name}>
              <span>{t.name}</span>
              <button
                onClick={() => {
                  onApply(t);
                  setMessage(`Applied “${t.name}”.`);
                }}
              >
                Apply
              </button>
              <button onClick={() => onDelete(t.name)} aria-label={`Delete ${t.name}`}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="row">
        <button disabled={templates.length === 0} onClick={() => downloadJson(templates, 'elisa-templates.json')}>
          Export templates
        </button>
        <label className="button">
          Import templates
          <input
            type="file"
            accept=".json,application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                const list = parseTemplates(JSON.parse(await f.text()));
                onImport(list);
                setMessage(`Imported ${list.length} template${list.length > 1 ? 's' : ''}.`);
              } catch (err) {
                setMessage(`Could not import: ${(err as Error).message}`);
              }
            }}
          />
        </label>
      </div>
      {message && <p className="hint">{message}</p>}
    </div>
  );
}
