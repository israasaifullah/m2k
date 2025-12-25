import { useMemo, useEffect } from "react";
import { useAppStore } from "../lib/store";
import { Select } from "./Select";

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
    <Select
      value={selectedEpic || ""}
      onChange={(value) => setSelectedEpic(value || null)}
      options={sortedEpics.map((epic) => ({
        value: epic.id,
        label: `${epic.id}: ${epic.title}`,
      }))}
      placeholder="All Epics"
      variant="pill"
      showChevron={true}
      aria-label="Filter tickets by epic"
    />
  );
}
