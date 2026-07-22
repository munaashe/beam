import type { BeamInput, DesignCode, LoadItem, SupportItem, SupportKind } from "../types/beam";

const DESIGN_CODES: DesignCode[] = ["EC2", "SANS10100"];
const SUPPORT_KINDS: SupportKind[] = ["FIXED", "PIN", "ROLLER"];

export function downloadBeamInput(input: BeamInput, filename = "beam-input.json") {
  const blob = new Blob([JSON.stringify(input, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ParseResult {
  ok: boolean;
  data?: BeamInput;
  errors: string[];
}

// v1 files had a single `support` enum; synthesize the equivalent end supports.
function migrateLegacySupport(legacySupport: unknown, spanLength: number): SupportItem[] | null {
  if (legacySupport === "SIMPLY_SUPPORTED") {
    return [
      { id: crypto.randomUUID(), type: "PIN", position: 0 },
      { id: crypto.randomUUID(), type: "ROLLER", position: spanLength },
    ];
  }
  if (legacySupport === "CANTILEVER") {
    return [{ id: crypto.randomUUID(), type: "FIXED", position: 0 }];
  }
  return null;
}

// Rejects a malformed file with a clear error instead of silently
// defaulting missing fields.
export function parseBeamInputFile(raw: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, errors: ["File is not valid JSON."] };
  }

  const errors: string[] = [];
  const obj = json as Record<string, unknown>;

  if (typeof obj !== "object" || obj === null) errors.push("File does not contain a JSON object.");
  if (!DESIGN_CODES.includes(obj.designCode as DesignCode)) {
    errors.push(`Unknown or missing designCode (expected one of ${DESIGN_CODES.join(", ")}).`);
  }
  if (typeof obj.spanLength !== "number" || obj.spanLength <= 0) {
    errors.push("spanLength must be a positive number.");
  }
  const section = obj.section as Record<string, unknown> | undefined;
  if (
    !section ||
    typeof section.width_mm !== "number" ||
    typeof section.depth_mm !== "number" ||
    typeof section.cover_mm !== "number"
  ) {
    errors.push("section must include numeric width_mm, depth_mm and cover_mm.");
  }
  if (typeof obj.fck !== "number" || typeof obj.fyk !== "number") {
    errors.push("fck and fyk must be numbers.");
  }
  if (!Array.isArray(obj.loads)) {
    errors.push("loads must be an array.");
  }

  let supports: SupportItem[] | null = null;
  if (obj.schemaVersion === 2) {
    if (!Array.isArray(obj.supports)) {
      errors.push("supports must be an array.");
    } else {
      const items = obj.supports as Record<string, unknown>[];
      const invalid = items.some(
        (s) => !SUPPORT_KINDS.includes(s.type as SupportKind) || typeof s.position !== "number",
      );
      if (invalid) {
        errors.push(`Each support needs a type (${SUPPORT_KINDS.join(", ")}) and a numeric position.`);
      } else {
        supports = items.map((s) => ({
          id: crypto.randomUUID(),
          type: s.type as SupportKind,
          position: s.position as number,
        }));
      }
    }
  } else {
    supports = migrateLegacySupport(obj.support, typeof obj.spanLength === "number" ? obj.spanLength : 0);
    if (!supports) {
      errors.push('Unknown or missing support (expected "SIMPLY_SUPPORTED" or "CANTILEVER").');
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  // Missing "length" (older files) means the UDL spans the full beam.
  const loads = (obj.loads as Record<string, unknown>[]).map((l) => ({
    id: crypto.randomUUID(),
    type: l.type,
    magnitude: l.magnitude,
    position: l.position ?? 0,
    length: l.length ?? (l.type === "UDL" ? obj.spanLength : 0),
  })) as LoadItem[];

  return {
    ok: true,
    errors: [],
    data: {
      schemaVersion: 2,
      designCode: obj.designCode as DesignCode,
      supports: supports!,
      spanLength: obj.spanLength as number,
      section: {
        width_mm: section!.width_mm as number,
        depth_mm: section!.depth_mm as number,
        cover_mm: section!.cover_mm as number,
      },
      fck: obj.fck as number,
      fyk: obj.fyk as number,
      torsion: typeof obj.torsion === "number" ? obj.torsion : 0,
      loads,
    },
  };
}
