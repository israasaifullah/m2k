import { useAppStore } from "../lib/store";

export function EpicFilter() {
  const epics = useAppStore((s) => s.epics);
  const selectedEpic = useAppStore((s) => s.selectedEpic);
  const setSelectedEpic = useAppStore((s) => s.setSelectedEpic);

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium">Filter by Epic:</label>
      <select
        value={selectedEpic || ""}
        onChange={(e) => setSelectedEpic(e.target.value || null)}
        className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
      >
        <option value="">All</option>
        {epics.map((epic) => (
          <option key={epic.id} value={epic.id}>
            {epic.id}: {epic.title}
          </option>
        ))}
      </select>
    </div>
  );
}
