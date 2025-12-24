import { useMemo } from "react";
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

  return (
    <div className="flex items-center gap-1.5 md:gap-2">
      <span className="text-xs md:text-sm text-[var(--geist-accents-5)]">Epic:</span>
      <select
        value={selectedEpic || ""}
        onChange={(e) => setSelectedEpic(e.target.value || null)}
        className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm bg-[var(--geist-accents-1)] border border-[var(--geist-accents-3)] rounded-md text-[var(--geist-foreground)] focus:border-[var(--geist-accents-5)] focus:outline-none transition-colors max-w-[150px] md:max-w-none"
      >
        <option value="">All</option>
        {sortedEpics.map((epic) => (
          <option key={epic.id} value={epic.id}>
            {epic.id}: {epic.title}
          </option>
        ))}
      </select>
    </div>
  );
}
