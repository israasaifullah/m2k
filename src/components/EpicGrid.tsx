import { useAppStore } from "../lib/store";
import { BookOpen, CheckCircle2, Circle } from "lucide-react";

export function EpicGrid() {
  const epics = useAppStore((s) => s.epics);
  const tickets = useAppStore((s) => s.tickets);
  const setSelectedEpic = useAppStore((s) => s.setSelectedEpic);

  const sortedEpics = [...epics].sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(b.id.replace(/\D/g, ""), 10) || 0;
    return numA - numB;
  });

  const getEpicStats = (epicId: string) => {
    const epicTickets = tickets.filter((t) => t.epic === epicId);
    const total = epicTickets.length;
    const completed = epicTickets.filter((t) => t.status === "done").length;
    return { total, completed };
  };

  const handleEpicClick = (epicId: string) => {
    setSelectedEpic(epicId);
  };

  if (epics.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <BookOpen size={32} className="mx-auto mb-2 text-[var(--geist-accents-4)]" />
          <p className="text-xs text-[var(--geist-accents-4)]">No epics found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {sortedEpics.map((epic) => {
            const stats = getEpicStats(epic.id);
            const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
            const isComplete = stats.total > 0 && stats.completed === stats.total;

            return (
              <button
                key={epic.id}
                onClick={() => handleEpicClick(epic.id)}
                className="group text-left p-2 rounded hover:bg-[var(--geist-accents-1)] transition-colors focus:outline-none"
              >
                <div className="flex items-center gap-2 mb-1">
                  {isComplete ? (
                    <CheckCircle2 size={14} className="text-[var(--monokai-green)] flex-shrink-0" />
                  ) : (
                    <Circle size={14} className="text-[var(--geist-accents-4)] flex-shrink-0" />
                  )}
                  <span className="text-[10px] text-[var(--geist-accents-4)] font-mono">{epic.id}</span>
                  <span className="text-[10px] text-[var(--geist-accents-4)] ml-auto">{stats.completed}/{stats.total}</span>
                </div>
                <h3 className="text-xs text-[var(--geist-foreground)] line-clamp-1 mb-1">
                  {epic.title}
                </h3>
                <div className="h-0.5 bg-[var(--geist-accents-2)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--monokai-green)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
