import type { BeamDesignResponse, CheckResult } from "../types/beam";

function CheckCard({ check }: { check: CheckResult }) {
  const utilisation = check.capacity > 0 ? (check.demand / check.capacity) * 100 : 0;
  const barColor = !check.pass ? "bg-red-500" : utilisation > 85 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="rounded border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-slate-800">{check.name}</h4>
        <span
          className={`rounded px-2 py-0.5 text-xs font-semibold ${
            check.pass ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          }`}
        >
          {check.pass ? "PASS" : "FAIL"}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Demand {check.demand.toFixed(1)} / Capacity {check.capacity.toFixed(1)}
      </p>
      <div className="mt-2 h-2 w-full rounded bg-slate-100">
        <div
          className={`h-2 rounded ${barColor}`}
          style={{ width: `${Math.min(utilisation, 100)}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-slate-700">{check.note}</p>
    </div>
  );
}

export function ResultsPanel({ result }: { result: BeamDesignResponse }) {
  const { analysis, design } = result;

  return (
    <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">Results</h2>

      <section className="grid grid-cols-2 gap-3 text-sm text-slate-700 sm:grid-cols-4">
        <div>
          <div className="text-slate-500">Max moment</div>
          <div className="font-medium">{analysis.maxMoment.toFixed(1)} kNm</div>
        </div>
        <div>
          <div className="text-slate-500">Max shear</div>
          <div className="font-medium">{analysis.maxShear.toFixed(1)} kN</div>
        </div>
        <div>
          <div className="text-slate-500">Torsion</div>
          <div className="font-medium">{analysis.torsion.toFixed(1)} kNm</div>
        </div>
        <div>
          <div className="text-slate-500">Reactions</div>
          <div className="font-medium">
            {analysis.reactionLeft.toFixed(1)} / {analysis.reactionRight.toFixed(1)} kN
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <CheckCard check={design.flexure} />
        <CheckCard check={design.shear} />
        <CheckCard check={design.torsion} />
      </section>
    </div>
  );
}
