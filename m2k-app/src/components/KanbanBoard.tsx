import { TrendingUp, Layers, Wifi, WifiOff, RefreshCw, AlertCircle, ListTodo, PlayCircle, CheckSquare } from "lucide-react";
import { useAppStore } from "../lib/store";
import { KanbanColumn } from "./KanbanColumn";
import { StatsPill } from "./StatsPill";
import { EpicFilter } from "./EpicFilter";
import { useStats, formatNumber } from "../hooks/useStats";
import { useApiStatus } from "../hooks/useApiStatus";
import type { Ticket } from "../types";

function sortByTicketId(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(b.id.replace(/\D/g, ""), 10) || 0;
    return numA - numB;
  });
}

function StatsSection() {
  const stats = useStats();
  const { state: apiState, refresh, loading } = useApiStatus();

  const getApiStatusProps = () => {
    switch (apiState) {
      case "connected":
        return { icon: Wifi, label: "API", value: "OK", color: "green" as const };
      case "disconnected":
        return { icon: WifiOff, label: "API", value: "Err", color: "red" as const };
      case "unconfigured":
        return { icon: AlertCircle, label: "API", value: "No Key", color: "orange" as const };
      default:
        return { icon: RefreshCw, label: "API", value: "...", color: "default" as const };
    }
  };

  const apiProps = getApiStatusProps();
  const hasStats = stats.totalEpics > 0 || stats.totalTickets > 0;

  return (
    <div className="flex items-center justify-center gap-3 py-3 border-b border-[var(--geist-accents-2)]">
      <EpicFilter />
      <div className="w-px h-4 bg-[var(--geist-accents-3)]" />
      {hasStats && (
        <>
          <StatsPill icon={Layers} label="Epics" value={`${stats.completedEpics}/${stats.totalEpics}`} color="blue" size="xs" />
          <StatsPill icon={TrendingUp} label="Progress" value={`${stats.epicCompletionPercent}%`} color={stats.epicCompletionPercent >= 75 ? "green" : stats.epicCompletionPercent >= 50 ? "blue" : "purple"} size="xs" />
          <StatsPill icon={ListTodo} label="Backlog" value={formatNumber(stats.backlogTickets)} color="default" size="xs" />
          <StatsPill icon={PlayCircle} label="Active" value={formatNumber(stats.inProgressTickets)} color="orange" size="xs" />
          <StatsPill icon={CheckSquare} label="Done" value={formatNumber(stats.doneTickets)} color="green" size="xs" />
        </>
      )}
      <button
        onClick={() => refresh()}
        disabled={loading}
        className="focus:outline-none focus:ring-2 focus:ring-[var(--geist-accents-3)] rounded-full"
        title="Click to refresh API status"
      >
        <StatsPill icon={apiProps.icon} label={apiProps.label} value={apiProps.value} color={apiProps.color} size="xs" />
      </button>
    </div>
  );
}

export function KanbanBoard() {
  const tickets = useAppStore((s) => s.tickets);
  const selectedEpic = useAppStore((s) => s.selectedEpic);

  const filteredTickets = selectedEpic
    ? tickets.filter((t) => t.epic === selectedEpic)
    : tickets;

  const backlog = sortByTicketId(filteredTickets.filter((t) => t.status === "backlog"));
  const inProgress = sortByTicketId(filteredTickets.filter((t) => t.status === "in_progress"));
  const done = sortByTicketId(filteredTickets.filter((t) => t.status === "done"));

  return (
    <div className="flex flex-col h-full min-h-0">
      <StatsSection />
      <div className="flex justify-center gap-3 md:gap-4 p-3 md:p-4 flex-1 min-h-0 overflow-auto">
        <KanbanColumn title="Backlog" tickets={backlog} />
        <KanbanColumn title="In Progress" tickets={inProgress} />
        <KanbanColumn title="Done" tickets={done} />
      </div>
    </div>
  );
}
