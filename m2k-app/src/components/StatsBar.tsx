import { TrendingUp, Layers, Wifi, WifiOff, RefreshCw, AlertCircle, ListTodo, PlayCircle, CheckSquare } from "lucide-react";
import { StatsPill } from "./StatsPill";
import { useStats, formatNumber } from "../hooks/useStats";
import { useApiStatus } from "../hooks/useApiStatus";

export function StatsBar() {
  const stats = useStats();
  const { state: apiState, refresh, loading } = useApiStatus();

  const getApiStatusProps = () => {
    switch (apiState) {
      case "connected":
        return { icon: Wifi, label: "Claude API", value: "Connected", color: "green" as const };
      case "disconnected":
        return { icon: WifiOff, label: "Claude API", value: "Error", color: "red" as const };
      case "unconfigured":
        return { icon: AlertCircle, label: "Claude API", value: "No Key", color: "orange" as const };
      default:
        return { icon: RefreshCw, label: "Claude API", value: "...", color: "default" as const };
    }
  };

  const apiProps = getApiStatusProps();
  const hasStats = stats.totalEpics > 0 || stats.totalTickets > 0;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {hasStats && (
        <>
          {/* Epic Stats */}
          <div className="flex items-center gap-2">
            <StatsPill
              icon={Layers}
              label="Epics"
              value={`${stats.completedEpics}/${stats.totalEpics}`}
              color="blue"
              size="sm"
            />
            <StatsPill
              icon={TrendingUp}
              label="Epic Progress"
              value={`${stats.epicCompletionPercent}%`}
              color={stats.epicCompletionPercent >= 75 ? "green" : stats.epicCompletionPercent >= 50 ? "blue" : "purple"}
              size="sm"
            />
          </div>

          {/* Ticket Stats */}
          <div className="hidden sm:flex items-center gap-2 border-l border-[var(--geist-accents-3)] pl-3">
            <StatsPill
              icon={ListTodo}
              label="Backlog"
              value={formatNumber(stats.backlogTickets)}
              color="default"
              size="sm"
            />
            <StatsPill
              icon={PlayCircle}
              label="In Progress"
              value={formatNumber(stats.inProgressTickets)}
              color="orange"
              size="sm"
            />
            <StatsPill
              icon={CheckSquare}
              label="Done"
              value={formatNumber(stats.doneTickets)}
              color="green"
              size="sm"
            />
          </div>

          {/* Mobile ticket summary */}
          <div className="flex sm:hidden items-center gap-2 border-l border-[var(--geist-accents-3)] pl-3">
            <StatsPill
              icon={CheckSquare}
              label="Tickets"
              value={`${stats.doneTickets}/${stats.totalTickets}`}
              color="green"
              size="sm"
            />
          </div>
        </>
      )}

      {/* API Status */}
      <div className={hasStats ? "border-l border-[var(--geist-accents-3)] pl-3" : ""}>
        <button
          onClick={() => refresh()}
          disabled={loading}
          className="focus:outline-none focus:ring-2 focus:ring-[var(--geist-accents-3)] rounded-full"
          title="Click to refresh API status"
        >
          <StatsPill
            icon={apiProps.icon}
            label={apiProps.label}
            value={apiProps.value}
            color={apiProps.color}
            size="sm"
          />
        </button>
      </div>
    </div>
  );
}
