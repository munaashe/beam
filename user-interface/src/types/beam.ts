export type DesignCode = "EC2" | "SANS10100";
export type SupportType = "SIMPLY_SUPPORTED" | "CANTILEVER";
export type SupportKind = "FIXED" | "PIN" | "ROLLER";
export type LoadType = "UDL" | "POINT_LOAD" | "POINT_MOMENT";

export interface Section {
  width_mm: number;
  depth_mm: number;
  cover_mm: number;
}

export interface SupportItem {
  id: string; // client-side only, for React keys - not sent to/from the backend
  type: SupportKind;
  position: number; // metres from end A
}

export interface LoadItem {
  id: string; // client-side only, for React keys - not sent to/from the backend
  type: LoadType;
  magnitude: number; // kN/m for UDL, kN for a point load, kNm for a point moment
  position: number; // metres from end A - for UDL, the start of the loaded region
  length: number; // UDL only: length of the loaded region
}

// `supports` is derived down to the backend's single `support` enum by
// lib/beam-validation.ts; v1 files (a bare `support` enum) migrate on load.
export interface BeamInput {
  schemaVersion: 2;
  designCode: DesignCode;
  supports: SupportItem[];
  spanLength: number;
  section: Section;
  fck: number;
  fyk: number;
  torsion: number;
  loads: LoadItem[];
}

export interface AnalysisResult {
  reactionLeft: number;
  reactionRight: number;
  maxMoment: number;
  maxShear: number;
  torsion: number;
  // Sampled shear/moment values along the span, from end A, for SFD/BMD.
  diagramX: number[];
  diagramShear: number[];
  diagramMoment: number[];
}

export interface CheckResult {
  name: string;
  demand: number;
  capacity: number;
  pass: boolean;
  note: string;
  requiredSteel_mm2: number;
}

export interface DesignResult {
  flexure: CheckResult;
  shear: CheckResult;
  torsion: CheckResult;
}

export interface BeamDesignResponse {
  analysis: AnalysisResult;
  design: DesignResult;
}

export function defaultBeamInput(): BeamInput {
  return {
    schemaVersion: 2,
    designCode: "EC2",
    supports: [
      { id: crypto.randomUUID(), type: "PIN", position: 0 },
      { id: crypto.randomUUID(), type: "ROLLER", position: 6 },
    ],
    spanLength: 6,
    section: { width_mm: 300, depth_mm: 500, cover_mm: 30 },
    fck: 30,
    fyk: 500,
    torsion: 0,
    loads: [{ id: crypto.randomUUID(), type: "UDL", magnitude: 25, position: 0, length: 6 }],
  };
}
