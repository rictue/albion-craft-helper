// Ported from Codex 2026-05-14 transmutation scanner.
import type { ComponentType, InputHTMLAttributes, SelectHTMLAttributes } from "react";
import type { LucideProps } from "lucide-react";

type Icon = ComponentType<LucideProps>;

interface NumberFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  max?: number;
  icon?: Icon;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  icon?: Icon;
}

export function NumberField({
  label,
  value,
  onValueChange,
  max,
  icon: IconComponent,
  className = "",
  ...props
}: NumberFieldProps) {
  return (
    <label className={`field-shell ${className}`}>
      <span className="field-label">
        {IconComponent ? <IconComponent aria-hidden="true" size={14} /> : null}
        {label}
      </span>
      <input
        {...props}
        type="text"
        inputMode="decimal"
        pattern="[0-9]*[.]?[0-9]*"
        min={props.min ?? 0}
        max={max}
        value={value}
        onChange={(event) => onValueChange(sanitizeNumber(event.target.value, max))}
        className="field-input"
      />
    </label>
  );
}

export function SelectField({
  label,
  icon: IconComponent,
  children,
  className = "",
  ...props
}: SelectFieldProps) {
  return (
    <label className={`field-shell ${className}`}>
      <span className="field-label">
        {IconComponent ? <IconComponent aria-hidden="true" size={14} /> : null}
        {label}
      </span>
      <select {...props} className="field-input appearance-none">
        {children}
      </select>
    </label>
  );
}

function sanitizeNumber(value: string, max?: number): string {
  const normalized = value.replace(",", ".");
  if (normalized === "") return "";
  if (normalized.includes("-")) return "0";
  if (!/^\d*\.?\d*$/.test(normalized)) return "";

  const numeric = Number(normalized);
  if (max !== undefined && Number.isFinite(numeric) && numeric > max) {
    return String(max);
  }

  return normalized;
}
