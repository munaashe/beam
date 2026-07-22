import { useState } from "react";
import { SUPPORT_KIND_OPTIONS } from "../hooks/use-beam-model";
import type { ValidationOutcome } from "../lib/beam-validation";
import type { SupportItem, SupportKind } from "../types/beam";
import { Modal } from "./modal";
import { NumberInput } from "./number-input";

const inputClass = "mt-1 rounded border border-slate-300 px-2 py-1";
const labelClass = "flex flex-col text-sm text-slate-600";

interface AddSupportModalProps {
  spanLength: number;
  support?: SupportItem;
  onSubmit: (candidate: { type: SupportKind; position: number }) => ValidationOutcome;
  onClose: () => void;
}

export function AddSupportModal({ spanLength, support, onSubmit, onClose }: AddSupportModalProps) {
  const isEditing = Boolean(support);
  const [type, setType] = useState<SupportKind>(support?.type ?? "PIN");
  const [position, setPosition] = useState(support?.position ?? 0);
  const [error, setError] = useState<string | null>(null);

  const otherSupportsWillBeRemoved = isEditing && type === "FIXED";

  function handleSubmit() {
    const outcome = onSubmit({ type, position });
    if (!outcome.ok) {
      setError(outcome.message ?? "Invalid support.");
      return;
    }
    onClose();
  }

  return (
    <Modal title={isEditing ? "Edit support" : "Add support"} onClose={onClose}>
      <div className="space-y-4">
        <label className={labelClass}>
          Support type
          <select
            className={inputClass}
            value={type}
            onChange={(e) => setType(e.target.value as SupportKind)}
          >
            {SUPPORT_KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Distance from A (m)
          <NumberInput className={inputClass} value={position} onChange={setPosition} min={0} max={spanLength} />
        </label>

        {otherSupportsWillBeRemoved && (
          <p className="text-sm text-amber-700">
            A fixed support must be the beam&apos;s only support, so any other supports will be removed.
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            {isEditing ? "Save changes" : "Add support"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
