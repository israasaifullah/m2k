import { useAppStore } from "../lib/store";
import { BookOpen, CheckCircle2, Circle } from "lucide-react";
import type { EpicPriority } from "../types";

const priorityConfig: Record<EpicPriority, { label: string; color: string }> = {
  P1: { label: "P1", color: "bg-red-500/20 text-red-500 border-red-500/50" },
  P2: { label: "P2", color: "bg-orange-500/20 text-orange-500 border-orange-500/50" },
  P3: { label: "P3", color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/50" },
  P4: { label: "P4", color: "bg-gray-500/20 text-gray-400 border-gray-500/50" },
};

function PriorityBadge({ priority }: { priority: EpicPriority }) {
  const config = priorityConfig[priority] || priorityConfig.P4;
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${config.color}`}>
      {config.label}
    </span>
  );
}

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
          <BookOpen size={48} className="mx-auto mb-4 text-[var(--geist-accents-4)]" />
          <h2 className="text-lg font-medium text-[var(--geist-foreground)] mb-2">
            No Epics Found
          </h2>
          <p className="text-sm text-[var(--geist-accents-5)]">
            Create an epic to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-[var(--geist-accents-2)]">
        <h1 className="text-xl font-semibold text-[var(--geist-foreground)]">
          Select an Epic
        </h1>
        <p className="text-sm text-[var(--geist-accents-5)] mt-1">
          Choose an epic to view its kanban board
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
          {sortedEpics.map((epic) => {
            const stats = getEpicStats(epic.id);
            const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
            const isComplete = stats.total > 0 && stats.completed === stats.total;

            return (
              <button
                key={epic.id}
                onClick={() => handleEpicClick(epic.id)}
                className="group relative bg-[var(--geist-accents-1)] hover:bg-[var(--geist-accents-2)] border border-[var(--geist-accents-3)] hover:border-[var(--geist-accents-4)] rounded-lg p-5 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-2 focus:ring-offset-[var(--geist-background)]"
              >
                <div className="flex items-start gap-3 mb-3">
                  {isComplete ? (
                    <CheckCircle2 size={20} className="text-[var(--geist-success)] flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle size={20} className="text-[var(--geist-accents-5)] flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-[var(--geist-foreground)] group-hover:text-[var(--ds-pink-500)] transition-colors line-clamp-2">
                      {epic.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[var(--geist-accents-5)] font-mono">
                        {epic.id}
                      </span>
                      <PriorityBadge priority={epic.priority} />
                    </div>
                  </div>
                </div>

                {epic.scope && (
                  <p className="text-sm text-[var(--geist-accents-6)] mb-4 line-clamp-2">
                    {epic.scope}
                  </p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--geist-accents-5)]">Progress</span>
                    <span className="text-[var(--geist-foreground)] font-medium">
                      {stats.completed}/{stats.total} tickets
                    </span>
                  </div>
                  <div className="h-1.5 bg-[var(--geist-accents-2)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--geist-success)] transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
