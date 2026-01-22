import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  showChevron?: boolean;
  disabled?: boolean;
  variant?: "default" | "pill" | "minimal";
  "aria-label"?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  showChevron = false,
  disabled = false,
  variant = "default",
  "aria-label": ariaLabel,
}: SelectProps) {
  const baseClassName = variant === "pill"
    ? "px-3 py-1 text-xs bg-gradient-to-r from-[var(--geist-accents-2)] to-[var(--geist-accents-1)] border border-[var(--geist-accents-3)] rounded-full text-[var(--geist-foreground)] hover:scale-[1.02] focus:outline-none focus:border-[var(--geist-success)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    : variant === "minimal"
    ? "px-1 py-1 text-xs bg-transparent text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] focus:outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    : "px-3 py-1.5 text-sm bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded-md text-[var(--geist-foreground)] hover:bg-[var(--geist-accents-1)] focus:outline-none focus:border-[var(--geist-success)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  const selectClassName = showChevron
    ? `appearance-none pr-8 ${baseClassName}`
    : baseClassName;

  return (
    <div className={`relative ${showChevron ? 'inline-flex items-center' : ''} ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClassName}
        aria-label={ariaLabel}
        disabled={disabled}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {showChevron && (
        <ChevronDown size={14} className="absolute right-2.5 pointer-events-none text-[var(--geist-accents-5)]" />
      )}
    </div>
  );
}
