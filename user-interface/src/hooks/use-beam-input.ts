import { useState } from "react";
import type { BeamInput, LoadItem, LoadType, Section } from "../types/beam";
import { defaultBeamInput } from "../types/beam";

export function useBeamInput() {
  const [beamInput, setBeamInput] = useState<BeamInput>(defaultBeamInput());

  function updateSection(patch: Partial<Section>) {
    setBeamInput((prev) => ({ ...prev, section: { ...prev.section, ...patch } }));
  }

  function updateField<K extends keyof BeamInput>(key: K, value: BeamInput[K]) {
    setBeamInput((prev) => ({ ...prev, [key]: value }));
  }

  function addLoad() {
    const newLoad: LoadItem = {
      id: crypto.randomUUID(),
      type: "UDL",
      magnitude: 0,
      position: 0,
    };
    setBeamInput((prev) => ({ ...prev, loads: [...prev.loads, newLoad] }));
  }

  function removeLoad(id: string) {
    setBeamInput((prev) => ({ ...prev, loads: prev.loads.filter((l) => l.id !== id) }));
  }

  function updateLoad(id: string, patch: Partial<Omit<LoadItem, "id">>) {
    setBeamInput((prev) => ({
      ...prev,
      loads: prev.loads.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  }

  return {
    beamInput,
    setBeamInput,
    updateSection,
    updateField,
    addLoad,
    removeLoad,
    updateLoad,
  };
}

export type LoadTypeOption = { value: LoadType; label: string };
export const LOAD_TYPE_OPTIONS: LoadTypeOption[] = [
  { value: "UDL", label: "UDL (kN/m)" },
  { value: "POINT_LOAD", label: "Point load (kN)" },
  { value: "POINT_MOMENT", label: "Point moment (kNm)" },
];
