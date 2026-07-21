import { useRef } from "react";
import type { useBeamInput } from "../hooks/use-beam-input";
import { LoadRow } from "./load-row";

type BeamInputHook = ReturnType<typeof useBeamInput>;

interface BeamFormProps extends BeamInputHook {
  onSubmit: () => void;
  onSave: () => void;
  onLoadFile: (file: File) => void;
  loading: boolean;
  validationErrors: string[];
}

const inputClass = "mt-1 rounded border border-slate-300 px-2 py-1";
const labelClass = "flex flex-col text-sm text-slate-600";

export function BeamForm({
  beamInput,
  updateSection,
  updateField,
  addLoad,
  removeLoad,
  updateLoad,
  onSubmit,
  onSave,
  onLoadFile,
  loading,
  validationErrors,
}: BeamFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-800">Beam input</h2>
        <div className="inline-flex rounded border border-slate-300 overflow-hidden text-sm">
          {(["EC2", "SANS10100"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => updateField("designCode", code)}
              className={`px-3 py-1 ${
                beamInput.designCode === code
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {code === "EC2" ? "Eurocode 2" : "SANS 10100"}
            </button>
          ))}
        </div>
      </div>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <label className={labelClass}>
          Support
          <select
            className={inputClass}
            value={beamInput.support}
            onChange={(e) => updateField("support", e.target.value as typeof beamInput.support)}
          >
            <option value="SIMPLY_SUPPORTED">Simply supported</option>
            <option value="CANTILEVER">Cantilever</option>
          </select>
        </label>
        <label className={labelClass}>
          Span (m)
          <input
            type="number"
            className={inputClass}
            value={beamInput.spanLength}
            onChange={(e) => updateField("spanLength", Number(e.target.value))}
          />
        </label>
        <label className={labelClass}>
          Applied torsion T_Ed (kNm)
          <input
            type="number"
            className={inputClass}
            value={beamInput.torsion}
            onChange={(e) => updateField("torsion", Number(e.target.value))}
          />
        </label>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium text-slate-700">Section (mm)</h3>
        <div className="grid grid-cols-3 gap-4">
          <label className={labelClass}>
            Width b
            <input
              type="number"
              className={inputClass}
              value={beamInput.section.width_mm}
              onChange={(e) => updateSection({ width_mm: Number(e.target.value) })}
            />
          </label>
          <label className={labelClass}>
            Overall depth h
            <input
              type="number"
              className={inputClass}
              value={beamInput.section.depth_mm}
              onChange={(e) => updateSection({ depth_mm: Number(e.target.value) })}
            />
          </label>
          <label className={labelClass}>
            Cover
            <input
              type="number"
              className={inputClass}
              value={beamInput.section.cover_mm}
              onChange={(e) => updateSection({ cover_mm: Number(e.target.value) })}
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium text-slate-700">Materials (MPa)</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <label className={labelClass}>
            Concrete {beamInput.designCode === "EC2" ? "fck" : "fcu"}
            <input
              type="number"
              className={inputClass}
              value={beamInput.fck}
              onChange={(e) => updateField("fck", Number(e.target.value))}
            />
          </label>
          <label className={labelClass}>
            Steel fyk
            <input
              type="number"
              className={inputClass}
              value={beamInput.fyk}
              onChange={(e) => updateField("fyk", Number(e.target.value))}
            />
          </label>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700">Loads (already-factored ULS design actions)</h3>
          <button
            type="button"
            onClick={addLoad}
            className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
          >
            + Add load
          </button>
        </div>
        <div className="space-y-2">
          {beamInput.loads.map((load) => (
            <LoadRow
              key={load.id}
              load={load}
              onChange={(patch) => updateLoad(load.id, patch)}
              onRemove={() => removeLoad(load.id)}
            />
          ))}
          {beamInput.loads.length === 0 && (
            <p className="text-sm text-slate-500">No loads defined yet.</p>
          )}
        </div>
      </section>

      {validationErrors.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <ul className="list-inside list-disc">
            {validationErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Analyze & design"}
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          Save input
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          Load input
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onLoadFile(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
