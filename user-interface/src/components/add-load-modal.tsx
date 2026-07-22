import { useState } from "react";
import { LOAD_TYPE_OPTIONS } from "../hooks/use-beam-model";
import type { ValidationOutcome } from "../lib/beam-validation";
import type { LoadType } from "../types/beam";
import { Modal } from "./modal";

const inputClass = "mt-1 rounded border border-slate-300 px-2 py-1";
const labelClass = "flex flex-col text-sm text-slate-600";

interface AddLoadModalProps {
  spanLength: number;
  onAdd: (candidate: { type: LoadType; magnitude: number; position: number; length: number }) => ValidationOutcome;
  onClose: () => void;
}

export function AddLoadModal({ spanLength, onAdd, onClose }: AddLoadModalProps) {
  const [type, setType] = useState<LoadType>("UDL");
  const [magnitude, setMagnitude] = useState(0);
  const [position, setPosition] = useState(0);
  const [fullSpan, setFullSpan] = useState(true);
  const [length, setLength] = useState(spanLength);
  const [error, setError] = useState<string | null>(null);

  const isUdl = type === "UDL";
  const isPartialUdl = isUdl && !fullSpan;

  function handleSubmit() {
    const candidate = isUdl
      ? { type, magnitude, position: fullSpan ? 0 : position, length: fullSpan ? spanLength : length }
      : { type, magnitude, position, length: 0 };
    const outcome = onAdd(candidate);
    if (!outcome.ok) {
      setError(outcome.message ?? "Invalid load.");
      return;
    }
    onClose();
  }

  return (
    <Modal title="Add load" onClose={onClose}>
      <div className="space-y-4">
        <label className={labelClass}>
          Load type
          <select
            className={inputClass}
            value={type}
            onChange={(e) => setType(e.target.value as LoadType)}
          >
            {LOAD_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Magnitude
          <input
            type="number"
            className={inputClass}
            value={magnitude}
            onChange={(e) => setMagnitude(Number(e.target.value))}
          />
        </label>

        {isUdl && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={fullSpan} onChange={(e) => setFullSpan(e.target.checked)} />
            Spans the full length
          </label>
        )}

        {(!isUdl || isPartialUdl) && (
          <label className={labelClass}>
            Distance from A (m)
            <input
              type="number"
              className={inputClass}
              value={position}
              min={0}
              max={spanLength}
              onChange={(e) => setPosition(Number(e.target.value))}
            />
          </label>
        )}

        {isPartialUdl && (
          <label className={labelClass}>
            Length (m)
            <input
              type="number"
              className={inputClass}
              value={length}
              min={0}
              max={spanLength}
              onChange={(e) => setLength(Number(e.target.value))}
            />
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Add load
          </button>
        </div>
      </div>
    </Modal>
  );
}
