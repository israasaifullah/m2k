import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  "aria-label": ariaLabel,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearch("");
    } else if (e.key === "Enter" && filteredOptions.length > 0) {
      handleSelect(filteredOptions[0].value);
    }
  };

  return (
    <div ref={containerRef} className="relative" aria-label={ariaLabel}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="truncate max-w-[150px]">
          {selectedOption ? selectedOption.label.split(":")[0] : placeholder}
        </span>
        <ChevronDown size={12} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-72 bg-[var(--geist-background)] border border-[var(--geist-accents-2)] rounded shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-[var(--geist-accents-2)]">
            <div className="flex items-center gap-2 px-2 py-1 bg-[var(--geist-accents-1)] rounded">
              <Search size={12} className="text-[var(--geist-accents-4)]" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search epics..."
                className="flex-1 bg-transparent text-xs text-[var(--geist-foreground)] placeholder:text-[var(--geist-accents-4)] focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-[var(--geist-accents-4)]">No results found</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-[var(--geist-accents-1)] transition-colors ${
                    option.value === value ? "text-[var(--geist-foreground)]" : "text-[var(--geist-accents-5)]"
                  }`}
                >
                  <span className="w-4 flex-shrink-0">
                    {option.value === value && <Check size={12} className="text-[var(--monokai-green)]" />}
                  </span>
                  <span className="truncate">{option.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
