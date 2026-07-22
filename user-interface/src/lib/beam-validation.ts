import type {
  AnalysisResult,
  BeamInput,
  LoadType,
  SupportItem,
  SupportKind,
  SupportType,
} from "../types/beam";

const POSITION_TOLERANCE_M = 1e-6;

function isAtEnd(position: number, span: number): boolean {
  return Math.abs(position) <= POSITION_TOLERANCE_M || Math.abs(position - span) <= POSITION_TOLERANCE_M;
}

export interface ValidationOutcome {
  ok: boolean;
  message?: string;
}

// Only accepts configurations the backend solver can analyze: two pin/roller
// supports at ends A and B, or a single fixed support at one end.
export function validateNewSupport(
  existing: SupportItem[],
  span: number,
  candidate: { type: SupportKind; position: number },
): ValidationOutcome {
  if (candidate.position < 0 || candidate.position > span) {
    return { ok: false, message: `Distance from A must be between 0 and ${span} m.` };
  }
  if (!isAtEnd(candidate.position, span)) {
    return {
      ok: false,
      message: `This version only supports supports at end A (0 m) or end B (${span} m).`,
    };
  }
  if (existing.some((s) => isAtEnd(s.position, span) && Math.abs(s.position - candidate.position) <= POSITION_TOLERANCE_M)) {
    return { ok: false, message: "There is already a support at that end." };
  }
  if (candidate.type === "FIXED") {
    if (existing.length > 0) {
      return {
        ok: false,
        message: "A fixed support must be the only support on the beam (cantilever). Remove the other support first.",
      };
    }
    return { ok: true };
  }
  if (existing.some((s) => s.type === "FIXED")) {
    return {
      ok: false,
      message: "This beam already has a fixed support (cantilever); remove it before adding another support.",
    };
  }
  if (existing.length >= 2) {
    return { ok: false, message: "A beam only needs supports at both ends." };
  }
  return { ok: true };
}

// Keeps a support at end B pinned to the end when the span changes.
export function repositionSupportsForSpan(
  supports: SupportItem[],
  oldSpan: number,
  newSpan: number,
): SupportItem[] {
  return supports.map((s) =>
    Math.abs(s.position - oldSpan) <= POSITION_TOLERANCE_M ? { ...s, position: newSpan } : s,
  );
}

export function validateNewLoad(
  span: number,
  candidate: { type: LoadType; magnitude: number; position: number; length: number },
): ValidationOutcome {
  if (candidate.magnitude === 0) {
    return { ok: false, message: "Magnitude must be non-zero." };
  }
  if (candidate.type === "UDL") {
    if (candidate.length <= 0) {
      return { ok: false, message: "Length must be greater than zero." };
    }
    if (candidate.position < 0 || candidate.position + candidate.length > span + POSITION_TOLERANCE_M) {
      return { ok: false, message: `The loaded region must fit within the span (0 - ${span} m).` };
    }
    return { ok: true };
  }
  if (candidate.position < 0 || candidate.position > span) {
    return { ok: false, message: `Distance from A must be between 0 and ${span} m.` };
  }
  return { ok: true };
}

export interface BackendSupportConfig {
  supportType: SupportType;
  fixedAtB: boolean;
}

// Turns the placed supports into the single condition the backend expects.
export function deriveBackendSupport(supports: SupportItem[], span: number): BackendSupportConfig | { error: string } {
  const fixed = supports.filter((s) => s.type === "FIXED");
  if (fixed.length > 1) {
    return { error: "A beam can only have one fixed support." };
  }
  if (fixed.length === 1) {
    if (supports.length > 1) {
      return { error: "A fixed support must be the only support on the beam (cantilever)." };
    }
    return { supportType: "CANTILEVER", fixedAtB: Math.abs(fixed[0].position - span) <= POSITION_TOLERANCE_M };
  }
  if (supports.length === 0) {
    return { error: "Add at least one support." };
  }
  if (supports.length === 1) {
    return { error: "A single pin/roller support isn't stable; add a support at the other end, or use a fixed support." };
  }
  const atA = supports.some((s) => Math.abs(s.position) <= POSITION_TOLERANCE_M);
  const atB = supports.some((s) => Math.abs(s.position - span) <= POSITION_TOLERANCE_M);
  if (!atA || !atB) {
    return { error: "Simply supported beams need a support at both end A and end B." };
  }
  return { supportType: "SIMPLY_SUPPORTED", fixedAtB: false };
}

// The backend always assumes the cantilever's fixed end is at x=0, so a
// fixed support at B needs load positions re-measured from B.
export function mirrorForBackend(
  input: BeamInput,
  fixedAtB: boolean,
): Pick<BeamInput, "spanLength" | "loads"> {
  if (!fixedAtB) return { spanLength: input.spanLength, loads: input.loads };
  return {
    spanLength: input.spanLength,
    loads: input.loads.map((load) => ({
      ...load,
      // Mirror the whole loaded interval, not just its start point.
      position:
        load.type === "UDL" ? input.spanLength - (load.position + load.length) : input.spanLength - load.position,
    })),
  };
}

// Mirrors diagram x/shear back to "distance from A"; moment sign is
// orientation-independent and needs no change.
export function unmirrorResult(analysis: AnalysisResult, fixedAtB: boolean, span: number): AnalysisResult {
  if (!fixedAtB) return analysis;
  const n = analysis.diagramX.length;
  const diagramX = new Array<number>(n);
  const diagramShear = new Array<number>(n);
  const diagramMoment = new Array<number>(n);
  for (let i = 0; i < n; ++i) {
    const j = n - 1 - i;
    diagramX[i] = span - analysis.diagramX[j];
    diagramShear[i] = -analysis.diagramShear[j];
    diagramMoment[i] = analysis.diagramMoment[j];
  }
  return { ...analysis, diagramX, diagramShear, diagramMoment };
}

// Maps reactionLeft/reactionRight onto the leftmost/rightmost support.
export function reactionsBySupportId(
  supports: SupportItem[],
  analysis: Pick<AnalysisResult, "reactionLeft" | "reactionRight">,
): Record<string, number> {
  if (supports.length === 0) return {};
  if (supports.length === 1) return { [supports[0].id]: analysis.reactionLeft };
  const sorted = [...supports].sort((a, b) => a.position - b.position);
  return {
    [sorted[0].id]: analysis.reactionLeft,
    [sorted[sorted.length - 1].id]: analysis.reactionRight,
  };
}
