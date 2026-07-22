import { useEffect, useState } from "react";

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  isValid?: (value: number) => boolean;
  className?: string;
  min?: number;
  max?: number;
}

function stripLeadingZero(text: string): string {
  return text.replace(/^(-?)0+(\d)/, "$1$2");
}


export function NumberInput({ value, onChange, isValid = Number.isFinite, className, min, max }: NumberInputProps) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    if (Number(text) !== value) setText(String(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = stripLeadingZero(e.target.value);
    setText(next);
    const parsed = Number(next);
    if (next.trim() !== "" && isValid(parsed)) onChange(parsed);
  }

  function handleBlur() {
    const parsed = Number(text);
    setText(isValid(parsed) ? String(parsed) : String(value));
  }

  return (
    <input
      type="number"
      className={className}
      value={text}
      min={min}
      max={max}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
