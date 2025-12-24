import { useMemo, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useAppStore } from "../lib/store";

export function EpicFilter() {
  const epics = useAppStore((s) => s.epics);
  const selectedEpic = useAppStore((s) => s.selectedEpic);
  const setSelectedEpic = useAppStore((s) => s.setSelectedEpic);

  const sortedEpics = useMemo(() => {
    return [...epics].sort((a, b) => {
      const numA = parseInt(a.id.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.id.replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });
  }, [epics]);

  // Auto-select latest epic on mount if none selected
  useEffect(() => {
    if (!selectedEpic && sortedEpics.length > 0) {
      const latestEpic = sortedEpics[sortedEpics.length - 1];
      setSelectedEpic(latestEpic.id);
    }
  }, [selectedEpic, sortedEpics, setSelectedEpic]);

  return (
    <div className="relative inline-flex items-center">
      <select
        id="epic-filter"
        value={selectedEpic || ""}
        onChange={(e) => setSelectedEpic(e.target.value || null)}
        className="appearance-none px-3 py-1.5 pr-8 text-xs font-medium bg-[var(--geist-accents-1)] border border-[var(--geist-accents-3)] rounded-full text-[var(--geist-foreground)] hover:bg-[var(--geist-accents-2)] focus:border-[var(--geist-success)] focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] transition-all cursor-pointer"
        aria-label="Filter tickets by epic"
      >
        <option value="">All Epics</option>
        {sortedEpics.map((epic) => (
          <option key={epic.id} value={epic.id}>
            {epic.id}: {epic.title}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2.5 pointer-events-none text-[var(--geist-accents-5)]" />
    </div>
  );
}
