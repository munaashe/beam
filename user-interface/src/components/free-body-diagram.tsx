import { reactionsBySupportId } from "../lib/beam-validation";
import type { AnalysisResult, LoadItem, SupportItem } from "../types/beam";
import { BeamDiagram } from "./beam-diagram";

const CHART_WIDTH = 640;
const CHART_HEIGHT = 140;
const CHART_MARGIN = 36;

function LineDiagram({
  x,
  y,
  color,
  title,
  unit,
}: {
  x: number[];
  y: number[];
  color: string;
  title: string;
  unit: string;
}) {
  const spanMax = x[x.length - 1] ?? 1;
  const maxAbs = Math.max(1e-9, ...y.map((v) => Math.abs(v)));

  const plotWidth = CHART_WIDTH - 2 * CHART_MARGIN;
  const plotHeight = CHART_HEIGHT - 2 * CHART_MARGIN;
  const zeroY = CHART_MARGIN + plotHeight / 2;

  const toX = (xi: number) => CHART_MARGIN + (xi / spanMax) * plotWidth;
  const toY = (yi: number) => zeroY - (yi / maxAbs) * (plotHeight / 2);

  const points = x.map((xi, i) => `${toX(xi)},${toY(y[i])}`).join(" ");
  const areaPoints = `${toX(x[0])},${zeroY} ${points} ${toX(x[x.length - 1])},${zeroY}`;

  const peakIndex = y.reduce((best, v, i) => (Math.abs(v) > Math.abs(y[best]) ? i : best), 0);

  return (
    <div>
      <h4 className="mb-1 text-sm font-medium text-slate-700">{title}</h4>
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full" role="img" aria-label={title}>
        <line x1={CHART_MARGIN} y1={zeroY} x2={CHART_WIDTH - CHART_MARGIN} y2={zeroY} stroke="#cbd5e1" strokeWidth={1} />
        <polygon points={areaPoints} fill={color} fillOpacity={0.15} />
        <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
        <circle cx={toX(x[peakIndex])} cy={toY(y[peakIndex])} r={3} fill={color} />
        <text x={toX(x[peakIndex])} y={toY(y[peakIndex]) - 8} textAnchor="middle" fontSize={11} fill={color}>
          {y[peakIndex].toFixed(1)} {unit}
        </text>
      </svg>
    </div>
  );
}

interface FreeBodyDiagramProps {
  spanLength: number;
  supports: SupportItem[];
  loads: LoadItem[];
  analysis: AnalysisResult;
}

export function FreeBodyDiagram({ spanLength, supports, loads, analysis }: FreeBodyDiagramProps) {
  const reactions = reactionsBySupportId(supports, analysis);

  return (
    <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">Free body diagram</h2>

      <BeamDiagram spanLength={spanLength} supports={supports} loads={loads} reactionsBySupportId={reactions} />

      <div className="grid gap-6 sm:grid-cols-2">
        <LineDiagram x={analysis.diagramX} y={analysis.diagramShear} color="#2563eb" title="Shear force diagram" unit="kN" />
        <LineDiagram x={analysis.diagramX} y={analysis.diagramMoment} color="#7c3aed" title="Bending moment diagram (sagging positive)" unit="kNm" />
      </div>
    </div>
  );
}
