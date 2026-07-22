import { deriveBackendSupport, mirrorForBackend, unmirrorResult } from "../lib/beam-validation";
import type { BeamDesignResponse, BeamInput } from "../types/beam";


const API_BASE = import.meta.env.VITE_API_URL || "/api";

export async function designBeam(input: BeamInput): Promise<BeamDesignResponse> {
  const config = deriveBackendSupport(input.supports, input.spanLength);
  if ("error" in config) throw new Error(config.error);

  const mirrored = mirrorForBackend(input, config.fixedAtB);

  const wireInput = {
    schemaVersion: 1,
    designCode: input.designCode,
    support: config.supportType,
    spanLength: mirrored.spanLength,
    section: input.section,
    fck: input.fck,
    fyk: input.fyk,
    torsion: input.torsion,
    loads: mirrored.loads.map((load) => ({
      type: load.type,
      magnitude: load.magnitude,
      position: load.position,
      length: load.length,
    })),
  };

  const res = await fetch(`${API_BASE}/beam/design`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(wireInput),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }

  const response = (await res.json()) as BeamDesignResponse;
  return { ...response, analysis: unmirrorResult(response.analysis, config.fixedAtB, input.spanLength) };
}
