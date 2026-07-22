import type { LoadItem, SupportItem } from "../types/beam";

const WIDTH = 640;
const HEIGHT = 220;
const MARGIN = 50;
const BEAM_Y = 100;

function scaleX(position: number, spanLength: number): number {
  if (spanLength <= 0) return MARGIN;
  return MARGIN + (position / spanLength) * (WIDTH - 2 * MARGIN);
}

export function supportLabel(s: SupportItem): string {
  const kind = s.type === "FIXED" ? "Fixed" : s.type === "PIN" ? "Pin" : "Roller";
  return `${kind} @ ${s.position} m`;
}

export function loadLabel(l: LoadItem, spanLength: number): string {
  switch (l.type) {
    case "UDL": {
      const isFullSpan = l.position <= 1e-6 && Math.abs(l.length - spanLength) <= 1e-6;
      if (isFullSpan) return `UDL ${l.magnitude} kN/m`;
      return `UDL ${l.magnitude} kN/m over ${l.length} m @ ${l.position} m from A`;
    }
    case "POINT_LOAD":
      return `Point load ${l.magnitude} kN @ ${l.position} m`;
    case "POINT_MOMENT":
      return `Point moment ${l.magnitude} kNm @ ${l.position} m`;
  }
}

function SupportGlyph({ support, spanLength }: { support: SupportItem; spanLength: number }) {
  const x = scaleX(support.position, spanLength);
  const isAtB = Math.abs(support.position - spanLength) < spanLength * 1e-6 && spanLength > 0;

  if (support.type === "FIXED") {
    // A hatched wall perpendicular to the beam, on the outside of whichever end it's at.
    const wallX = isAtB ? x + 10 : x - 10;
    const hatchDir = isAtB ? 1 : -1;
    const hatches = Array.from({ length: 5 }, (_, i) => {
      const y = BEAM_Y - 20 + i * 10;
      return (
        <line
          key={i}
          x1={wallX}
          y1={y}
          x2={wallX + hatchDir * 8}
          y2={y + 8}
          stroke="#475569"
          strokeWidth={1.5}
        />
      );
    });
    return (
      <g>
        <line x1={wallX} y1={BEAM_Y - 22} x2={wallX} y2={BEAM_Y + 22} stroke="#475569" strokeWidth={2} />
        {hatches}
      </g>
    );
  }

  const triangle = `${x - 11},${BEAM_Y + 20} ${x + 11},${BEAM_Y + 20} ${x},${BEAM_Y}`;
  return (
    <g>
      <polygon points={triangle} fill="white" stroke="#475569" strokeWidth={2} />
      {support.type === "ROLLER" && (
        <>
          <circle cx={x - 6} cy={BEAM_Y + 25} r={3.5} fill="white" stroke="#475569" strokeWidth={1.5} />
          <circle cx={x + 6} cy={BEAM_Y + 25} r={3.5} fill="white" stroke="#475569" strokeWidth={1.5} />
        </>
      )}
      <line
        x1={x - 15}
        y1={support.type === "ROLLER" ? BEAM_Y + 29 : BEAM_Y + 20}
        x2={x + 15}
        y2={support.type === "ROLLER" ? BEAM_Y + 29 : BEAM_Y + 20}
        stroke="#475569"
        strokeWidth={1.5}
      />
    </g>
  );
}

function PointLoadArrow({ x, magnitude, unit }: { x: number; magnitude: number; unit: string }) {
  return (
    <g>
      <line x1={x} y1={BEAM_Y - 42} x2={x} y2={BEAM_Y - 3} stroke="#dc2626" strokeWidth={2} />
      <polygon points={`${x - 5},${BEAM_Y - 10} ${x + 5},${BEAM_Y - 10} ${x},${BEAM_Y - 2}`} fill="#dc2626" />
      <text x={x} y={BEAM_Y - 48} textAnchor="middle" fontSize={11} fill="#dc2626">
        {magnitude} {unit}
      </text>
    </g>
  );
}

function UdlArrows({
  spanLength,
  magnitude,
  position,
  length,
}: {
  spanLength: number;
  magnitude: number;
  position: number;
  length: number;
}) {
  const count = 7;
  const y1 = BEAM_Y - 26;
  const start = position;
  const end = position + length;
  const positions = Array.from({ length: count }, (_, i) => start + (length * i) / (count - 1));
  return (
    <g>
      <line x1={scaleX(start, spanLength)} y1={y1} x2={scaleX(end, spanLength)} y2={y1} stroke="#dc2626" strokeWidth={1.5} />
      {positions.map((p, i) => {
        const x = scaleX(p, spanLength);
        return (
          <g key={i}>
            <line x1={x} y1={y1} x2={x} y2={BEAM_Y - 3} stroke="#dc2626" strokeWidth={1.5} />
            <polygon points={`${x - 4},${BEAM_Y - 9} ${x + 4},${BEAM_Y - 9} ${x},${BEAM_Y - 2}`} fill="#dc2626" />
          </g>
        );
      })}
      <text x={scaleX((start + end) / 2, spanLength)} y={y1 - 6} textAnchor="middle" fontSize={11} fill="#dc2626">
        {magnitude} kN/m
      </text>
    </g>
  );
}

function PointMomentGlyph({ x, magnitude }: { x: number; magnitude: number }) {
  const symbol = magnitude >= 0 ? "↻" : "↺";
  return (
    <g>
      <text x={x} y={BEAM_Y - 20} textAnchor="middle" fontSize={26} fill="#dc2626">
        {symbol}
      </text>
      <text x={x} y={BEAM_Y - 44} textAnchor="middle" fontSize={11} fill="#dc2626">
        {magnitude} kNm
      </text>
    </g>
  );
}

interface BeamDiagramProps {
  spanLength: number;
  supports: SupportItem[];
  loads: LoadItem[];
  reactionsBySupportId?: Record<string, number>;
  onRemoveSupport?: (id: string) => void;
  onEditSupport?: (id: string) => void;
  onRemoveLoad?: (id: string) => void;
}

export function BeamDiagram({
  spanLength,
  supports,
  loads,
  reactionsBySupportId,
  onRemoveSupport,
  onEditSupport,
  onRemoveLoad,
}: BeamDiagramProps) {
  const editable = Boolean(onRemoveSupport || onRemoveLoad);

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Beam diagram">
        <line x1={MARGIN} y1={BEAM_Y} x2={WIDTH - MARGIN} y2={BEAM_Y} stroke="#1e293b" strokeWidth={4} />

        <text x={MARGIN} y={BEAM_Y + 60} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#1e293b">
          A
        </text>
        <text x={WIDTH - MARGIN} y={BEAM_Y + 60} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#1e293b">
          B
        </text>

        {supports.map((s) => (
          <SupportGlyph key={s.id} support={s} spanLength={spanLength} />
        ))}

        {loads.map((l) => {
          if (l.type === "UDL") {
            return (
              <UdlArrows
                key={l.id}
                spanLength={spanLength}
                magnitude={l.magnitude}
                position={l.position}
                length={l.length}
              />
            );
          }
          const x = scaleX(l.position, spanLength);
          if (l.type === "POINT_LOAD") return <PointLoadArrow key={l.id} x={x} magnitude={l.magnitude} unit="kN" />;
          return <PointMomentGlyph key={l.id} x={x} magnitude={l.magnitude} />;
        })}

        {reactionsBySupportId &&
          supports.map((s) => {
            const value = reactionsBySupportId[s.id];
            if (value === undefined) return null;
            const x = scaleX(s.position, spanLength);
            return (
              <text key={s.id} x={x} y={BEAM_Y + 76} textAnchor="middle" fontSize={11} fill="#0f766e">
                {value.toFixed(1)} kN
              </text>
            );
          })}
      </svg>

      {(supports.length > 0 || loads.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {supports.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
            >
              {onEditSupport ? (
                <button
                  type="button"
                  onClick={() => onEditSupport(s.id)}
                  aria-label={`Edit ${supportLabel(s)}`}
                  className="hover:underline"
                >
                  {supportLabel(s)}
                </button>
              ) : (
                supportLabel(s)
              )}
              {editable && (
                <button
                  type="button"
                  onClick={() => onRemoveSupport?.(s.id)}
                  aria-label={`Remove ${supportLabel(s)}`}
                  className="text-slate-400 hover:text-red-600"
                >
                  ×
                </button>
              )}
            </span>
          ))}
          {loads.map((l) => (
            <span
              key={l.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700"
            >
              {loadLabel(l, spanLength)}
              {editable && (
                <button
                  type="button"
                  onClick={() => onRemoveLoad?.(l.id)}
                  aria-label={`Remove ${loadLabel(l, spanLength)}`}
                  className="text-red-400 hover:text-red-700"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
