import type { BeamDesignResponse, BeamInput } from "../types/beam";

export async function designBeam(input: BeamInput): Promise<BeamDesignResponse> {
  // Strip the client-only `id` field before sending.
  const wireInput = {
    ...input,
    loads: input.loads.map((load) => ({
      type: load.type,
      magnitude: load.magnitude,
      position: load.position,
    })),
  };

  const res = await fetch("/api/beam/design", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(wireInput),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }

  return res.json() as Promise<BeamDesignResponse>;
}
