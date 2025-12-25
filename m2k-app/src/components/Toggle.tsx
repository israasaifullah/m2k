interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  showLabel?: boolean;
  id?: string;
  disabled?: boolean;
}

export function Toggle({
  checked,
  onChange,
  label = "VIM",
  showLabel = true,
  id,
  disabled = false
}: ToggleProps) {
  return (
    <button
      id={id}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex items-center h-6 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-2 focus:ring-offset-[var(--geist-background)] disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-[var(--geist-success)]' : 'bg-[var(--geist-accents-3)]'
      } ${showLabel ? 'w-14 px-1' : 'w-11'}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
    >
      {showLabel && checked && (
        <span className="absolute left-1.5 text-[10px] font-bold text-white uppercase tracking-tight">
          {label}
        </span>
      )}
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
          showLabel
            ? (checked ? 'translate-x-8' : 'translate-x-0')
            : (checked ? 'translate-x-5' : 'translate-x-1')
        }`}
      />
    </button>
  );
}
