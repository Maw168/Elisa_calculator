import { useState } from 'react';
import type { Plate } from '../core/types';
import { parsePaste } from '../core/parse';
import { defaultBlockIndex, findPlateBlocks, readWorkbook, type PlateBlock } from '../core/xlsxBlocks';
import { MiniPlate } from './MiniPlate';

interface Props {
  onLoad: (plate: Plate, sourceName: string) => void;
}

export function PlateInput({ onLoad }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<PlateBlock[]>([]);
  const [picked, setPicked] = useState(0);
  const [fileName, setFileName] = useState('');

  function loadPaste() {
    const r = parsePaste(text);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    onLoad(r.plate, 'pasted');
  }

  async function openFile(file: File) {
    setBlocks([]);
    try {
      const wb = readWorkbook(await file.arrayBuffer());
      const found = findPlateBlocks(wb);
      if (found.length === 0) {
        setError(`No 8 x 12 plate block (a "<>" cell with 1-12 and A-H headers) found in ${file.name}.`);
        return;
      }
      setError(null);
      setFileName(file.name);
      setBlocks(found);
      setPicked(defaultBlockIndex(found));
    } catch (e) {
      setError(`Could not read ${file.name}: ${(e as Error).message}`);
    }
  }

  return (
    <section className="card">
      <h2>1. Load plate values</h2>
      <div className="input-grid">
        <div>
          <label htmlFor="paste">Paste an 8 x 12 block copied from Excel (headers optional)</label>
          <textarea
            id="paste"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'<>\t1\t2\t3 ...\nA\t565.46\t\t372.19 ...'}
          />
          <button onClick={loadPaste} disabled={text.trim() === ''}>
            Load pasted data
          </button>
        </div>
        <div>
          <label htmlFor="file">…or open the reader's .xlsx export</label>
          <input
            id="file"
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void openFile(f);
              e.target.value = '';
            }}
          />
          {blocks.length > 0 && (
            <div className="blocks">
              <p className="hint">
                {blocks.length} plate block{blocks.length > 1 ? 's' : ''} found in {fileName}. Pick one:
              </p>
              <div className="block-list">
                {blocks.map((b, i) => (
                  <label key={`${b.sheet}-${b.headerAddress}`} className={`block ${i === picked ? 'picked' : ''}`}>
                    <input type="radio" name="block" checked={i === picked} onChange={() => setPicked(i)} />
                    <span>
                      {b.sheet} · {b.headerAddress} · {b.numericCount} numeric wells
                    </span>
                    <MiniPlate plate={b.plate} />
                  </label>
                ))}
              </div>
              <button
                onClick={() => {
                  onLoad(blocks[picked].plate, fileName);
                  setBlocks([]);
                }}
              >
                Use this block
              </button>
            </div>
          )}
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error} The current plate was not changed.
        </p>
      )}
    </section>
  );
}
