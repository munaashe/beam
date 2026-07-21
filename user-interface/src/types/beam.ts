export type DesignCode = "EC2" | "SANS10100";
export type SupportType = "SIMPLY_SUPPORTED" | "CANTILEVER";
export type LoadType = "UDL" | "POINT_LOAD" | "POINT_MOMENT";

export interface Section {
  width_mm: number;
  depth_mm: number;
  cover_mm: number;
}

export interface LoadItem {
  id: string; // client-side only, for React keys - not sent to/from the backend
  type: LoadType;
  magnitude: number; // kN/m for UDL, kN for a point load, kNm for a point moment
  position: number; // metres from the left/fixed support - ignored for UDL
}

// Mirrors the backend's Beam JSON exactly (see backend/src/core/beam.cpp).
export interface BeamInput {
  schemaVersion: 1;
  designCode: DesignCode;
  support: SupportType;
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
    schemaVersion: 1,
    designCode: "EC2",
    support: "SIMPLY_SUPPORTED",
    spanLength: 6,
    section: { width_mm: 300, depth_mm: 500, cover_mm: 30 },
    fck: 30,
    fyk: 500,
    torsion: 0,
    loads: [{ id: crypto.randomUUID(), type: "UDL", magnitude: 25, position: 0 }],
  };
}
