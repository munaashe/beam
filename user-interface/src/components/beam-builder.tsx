import { useEffect, useRef, useState } from "react";
import type { useBeamModel } from "../hooks/use-beam-model";
import { AddLoadModal } from "./add-load-modal";
import { AddSupportModal } from "./add-support-modal";
import { BeamDiagram } from "./beam-diagram";

type BeamModelHook = ReturnType<typeof useBeamModel>;

interface BeamBuilderProps extends BeamModelHook {
  onSubmit: () => void;
  onSave: () => void;
  onLoadFile: (file: File) => void;
  loading: boolean;
  validationErrors: string[];
}

const inputClass = "mt-1 rounded border border-slate-300 px-2 py-1";
const labelClass = "flex flex-col text-sm text-slate-600";

export function BeamBuilder({
  beamInput,
  updateSection,
  updateField,
  updateSpanLength,
  addSupport,
  updateSupport,
  removeSupport,
  addLoad,
  removeLoad,
  onSubmit,
  onSave,
  onLoadFile,
  loading,
  validationErrors,
}: BeamBuilderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [editingSupportId, setEditingSupportId] = useState<string | null>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const editingSupport = beamInput.supports.find((s) => s.id === editingSupportId);

  // Decoupled from spanLength so transient empty/zero states while typing
  // never reach updateSpanLength (a zero-length span breaks support tracking).
  const [spanText, setSpanText] = useState(String(beamInput.spanLength));

  useEffect(() => {
    setSpanText(String(beamInput.spanLength));
  }, [beamInput.spanLength]);

  function handleSpanChange(text: string) {
    setSpanText(text);
    const parsed = Number(text);
    if (Number.isFinite(parsed) && parsed > 0) {
      updateSpanLength(parsed);
    }
  }

  function handleSpanBlur() {
    const parsed = Number(spanText);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setSpanText(String(beamInput.spanLength));
    }
  }

  return (
    <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-800">Beam A—B</h2>
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

      <label className={labelClass + " max-w-xs"}>
        Span length A—B (m)
        <input
          type="number"
          className={inputClass}
          value={spanText}
          min={0.1}
          onChange={(e) => handleSpanChange(e.target.value)}
          onBlur={handleSpanBlur}
        />
      </label>

      <BeamDiagram
        spanLength={beamInput.spanLength}
        supports={beamInput.supports}
        loads={beamInput.loads}
        onRemoveSupport={removeSupport}
        onEditSupport={setEditingSupportId}
        onRemoveLoad={removeLoad}
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowSupportModal(true)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          + Add support
        </button>
        <button
          type="button"
          onClick={() => setShowLoadModal(true)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          + Add load
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="ml-auto rounded bg-slate-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Analyse & Design"}
        </button>
      </div>

      <details className="rounded border border-slate-200 p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">Section &amp; materials</summary>
        <div className="mt-4 space-y-4">
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
              <label className={labelClass}>
                Applied torsion T_Ed (kNm)
                <input
                  type="number"
                  className={inputClass}
                  value={beamInput.torsion}
                  onChange={(e) => updateField("torsion", Number(e.target.value))}
                />
              </label>
            </div>
          </section>
        </div>
      </details>

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

      {showSupportModal && (
        <AddSupportModal
          spanLength={beamInput.spanLength}
          onSubmit={addSupport}
          onClose={() => setShowSupportModal(false)}
        />
      )}
      {editingSupport && (
        <AddSupportModal
          spanLength={beamInput.spanLength}
          support={editingSupport}
          onSubmit={(candidate) => updateSupport(editingSupport.id, candidate)}
          onClose={() => setEditingSupportId(null)}
        />
      )}
      {showLoadModal && (
        <AddLoadModal
          spanLength={beamInput.spanLength}
          onAdd={addLoad}
          onClose={() => setShowLoadModal(false)}
        />
      )}
    </div>
  );
}
