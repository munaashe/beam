import { useState } from "react";
import { designBeam } from "./api/beam-client";
import { BeamBuilder } from "./components/beam-builder";
import { FreeBodyDiagram } from "./components/free-body-diagram";
import { ResultsPanel } from "./components/results-panel";
import { useBeamModel } from "./hooks/use-beam-model";
import { deriveBackendSupport, validateNewLoad } from "./lib/beam-validation";
import { downloadBeamInput, parseBeamInputFile } from "./lib/beam-file";
import type { BeamDesignResponse } from "./types/beam";

function validate(input: ReturnType<typeof useBeamModel>["beamInput"]): string[] {
  const errors: string[] = [];
  if (input.spanLength <= 0) errors.push("Span must be a positive number.");
  if (input.section.width_mm <= 0 || input.section.depth_mm <= 0) {
    errors.push("Section width and depth must be positive.");
  }
  if (input.section.cover_mm >= input.section.depth_mm / 2) {
    errors.push("Cover must leave room for an effective depth (cover < depth / 2).");
  }

  const supportConfig = deriveBackendSupport(input.supports, input.spanLength);
  if ("error" in supportConfig) errors.push(supportConfig.error);

  if (input.loads.length === 0) errors.push("Add at least one load.");
  for (const load of input.loads) {
    const outcome = validateNewLoad(input.spanLength, load);
    if (!outcome.ok) errors.push(outcome.message ?? "Invalid load.");
  }
  return errors;
}

function App() {
  const beamModelHook = useBeamModel();
  const { beamInput, setBeamInput } = beamModelHook;

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<BeamDesignResponse | null>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  async function handleSubmit() {
    const errors = validate(beamInput);
    setValidationErrors(errors);
    if (errors.length > 0) return;

    setLoading(true);
    setApiError(null);
    try {
      const response = await designBeam(beamInput);
      setResult(response);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Unknown error");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    downloadBeamInput(beamInput);
  }

  async function handleLoadFile(file: File) {
    const text = await file.text();
    const parsed = parseBeamInputFile(text);
    if (!parsed.ok || !parsed.data) {
      setFileErrors(parsed.errors);
      return;
    }
    setFileErrors([]);
    setBeamInput(parsed.data);
    setResult(null);
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10">
      <header className="mx-auto w-full max-w-5xl">
        <h1 className="text-2xl font-bold text-slate-900">Beam</h1>
        <p className="mt-1 text-slate-600">
          Analysis and design of rectangular reinforced concrete beams, to Eurocode 2 or SANS 10100.
        </p>
      </header>

      <div className="mx-auto mt-6 flex w-full max-w-5xl flex-col gap-6">
        {fileErrors.length > 0 && (
          <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 print:hidden">
            <p className="font-medium">Could not load that file:</p>
            <ul className="list-inside list-disc">
              {fileErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="print:hidden">
          <BeamBuilder
            {...beamModelHook}
            onSubmit={handleSubmit}
            onSave={handleSave}
            onLoadFile={handleLoadFile}
            loading={loading}
            validationErrors={validationErrors}
          />
        </div>

        {apiError && (
          <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 print:hidden">
            {apiError}
          </div>
        )}

        {result && (
          <>
            <div className="flex justify-end print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              >
                Save as PDF
              </button>
            </div>
            <FreeBodyDiagram
              spanLength={beamInput.spanLength}
              supports={beamInput.supports}
              loads={beamInput.loads}
              analysis={result.analysis}
            />
            <ResultsPanel result={result} />
          </>
        )}
      </div>
    </main>
  );
}

export default App;
