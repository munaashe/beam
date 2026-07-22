import { useState } from "react";
import type { BeamInput, LoadItem, LoadType, Section, SupportItem, SupportKind } from "../types/beam";
import { defaultBeamInput } from "../types/beam";
import type { ValidationOutcome } from "../lib/beam-validation";
import { repositionSupportsForSpan, validateNewLoad, validateNewSupport } from "../lib/beam-validation";

export function useBeamModel() {
  const [beamInput, setBeamInput] = useState<BeamInput>(defaultBeamInput());

  function updateSection(patch: Partial<Section>) {
    setBeamInput((prev) => ({ ...prev, section: { ...prev.section, ...patch } }));
  }

  function updateField<K extends keyof BeamInput>(key: K, value: BeamInput[K]) {
    setBeamInput((prev) => ({ ...prev, [key]: value }));
  }

  function updateSpanLength(newSpan: number) {
    setBeamInput((prev) => ({
      ...prev,
      spanLength: newSpan,
      supports: repositionSupportsForSpan(prev.supports, prev.spanLength, newSpan),
    }));
  }

  function addSupport(candidate: { type: SupportKind; position: number }): ValidationOutcome {
    const outcome = validateNewSupport(beamInput.supports, beamInput.spanLength, candidate);
    if (!outcome.ok) return outcome;
    const newSupport: SupportItem = { id: crypto.randomUUID(), ...candidate };
    setBeamInput((prev) => ({ ...prev, supports: [...prev.supports, newSupport] }));
    return outcome;
  }

  // A fixed support must be the beam's only support, so switching a support
  // to/from FIXED implicitly drops whatever it would otherwise conflict with.
  function updateSupport(id: string, patch: { type: SupportKind; position: number }): ValidationOutcome {
    const current = beamInput.supports.find((s) => s.id === id);
    if (!current) return { ok: false, message: "Support not found." };
    const candidate: SupportItem = { ...current, ...patch };
    const others = beamInput.supports.filter((s) => s.id !== id);
    const othersToKeep = candidate.type === "FIXED" ? [] : others.filter((s) => s.type !== "FIXED");

    const outcome = validateNewSupport(othersToKeep, beamInput.spanLength, candidate);
    if (!outcome.ok) return outcome;
    setBeamInput((prev) => ({ ...prev, supports: [...othersToKeep, candidate] }));
    return outcome;
  }

  function removeSupport(id: string) {
    setBeamInput((prev) => ({ ...prev, supports: prev.supports.filter((s) => s.id !== id) }));
  }

  function addLoad(candidate: { type: LoadType; magnitude: number; position: number; length: number }): ValidationOutcome {
    const outcome = validateNewLoad(beamInput.spanLength, candidate);
    if (!outcome.ok) return outcome;
    const newLoad: LoadItem = { id: crypto.randomUUID(), ...candidate };
    setBeamInput((prev) => ({ ...prev, loads: [...prev.loads, newLoad] }));
    return outcome;
  }

  function removeLoad(id: string) {
    setBeamInput((prev) => ({ ...prev, loads: prev.loads.filter((l) => l.id !== id) }));
  }

  return {
    beamInput,
    setBeamInput,
    updateSection,
    updateField,
    updateSpanLength,
    addSupport,
    updateSupport,
    removeSupport,
    addLoad,
    removeLoad,
  };
}

export type LoadTypeOption = { value: LoadType; label: string };
export const LOAD_TYPE_OPTIONS: LoadTypeOption[] = [
  { value: "UDL", label: "UDL (kN/m)" },
  { value: "POINT_LOAD", label: "Point load (kN)" },
  { value: "POINT_MOMENT", label: "Point moment (kNm)" },
];

export type SupportKindOption = { value: SupportKind; label: string };
export const SUPPORT_KIND_OPTIONS: SupportKindOption[] = [
  { value: "PIN", label: "Pinned" },
  { value: "ROLLER", label: "Roller" },
  { value: "FIXED", label: "Fixed" },
];
