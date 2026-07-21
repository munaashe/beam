import { LOAD_TYPE_OPTIONS } from "../hooks/use-beam-input";
import type { LoadItem } from "../types/beam";

interface LoadRowProps {
  load: LoadItem;
  onChange: (patch: Partial<Omit<LoadItem, "id">>) => void;
  onRemove: () => void;
}

export function LoadRow({ load, onChange, onRemove }: LoadRowProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded border border-slate-300 bg-white p-3">
      <label className="flex flex-col text-sm text-slate-600">
        Type
        <select
          className="mt-1 rounded border border-slate-300 px-2 py-1"
          value={load.type}
          onChange={(e) => onChange({ type: e.target.value as LoadItem["type"] })}
        >
          {LOAD_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-sm text-slate-600">
        Magnitude
        <input
          type="number"
          className="mt-1 w-28 rounded border border-slate-300 px-2 py-1"
          value={load.magnitude}
          onChange={(e) => onChange({ magnitude: Number(e.target.value) })}
        />
      </label>

      {load.type !== "UDL" && (
        <label className="flex flex-col text-sm text-slate-600">
          Position (m)
          <input
            type="number"
            className="mt-1 w-28 rounded border border-slate-300 px-2 py-1"
            value={load.position}
            onChange={(e) => onChange({ position: Number(e.target.value) })}
          />
        </label>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="ml-auto rounded border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
      >
        Remove
      </button>
    </div>
  );
}
