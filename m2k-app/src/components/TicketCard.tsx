import { useState } from "react";
import type { Ticket } from "../types";

interface Props {
  ticket: Ticket;
}

const epicColors: Record<string, string> = {
  "EPIC-001": "bg-blue-500",
  "EPIC-002": "bg-green-500",
  "EPIC-003": "bg-purple-500",
  "EPIC-004": "bg-orange-500",
  "EPIC-005": "bg-pink-500",
  "EPIC-006": "bg-cyan-500",
  "EPIC-007": "bg-rose-500",
  "EPIC-008": "bg-amber-500",
};

function PulsingDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
    </span>
  );
}

export function TicketCard({ ticket }: Props) {
  const [expanded, setExpanded] = useState(false);
  const epicColor = epicColors[ticket.epic] || "bg-gray-500";
  const isInProgress = ticket.status === "in_progress";

  const cardClass = isInProgress
    ? "bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950 rounded-lg shadow-lg p-3 cursor-pointer hover:shadow-xl transition-all border-2 border-cyan-400 dark:border-cyan-600 animate-pulse-subtle"
    : "bg-white dark:bg-gray-900 rounded-lg shadow p-3 cursor-pointer hover:shadow-md transition-shadow";

  return (
    <div className={cardClass} onClick={() => setExpanded(!expanded)}>
      <div className="flex items-start gap-2">
        {isInProgress && <PulsingDot />}
        <span
          className={`${epicColor} text-white text-xs px-1.5 py-0.5 rounded shrink-0`}
        >
          {ticket.epic}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
          {ticket.id}
        </span>
        {isInProgress && (
          <span className="ml-auto text-xs text-cyan-600 dark:text-cyan-400 font-medium animate-pulse">
            Working...
          </span>
        )}
      </div>
      <h3 className="font-medium mt-2 text-sm">{ticket.title}</h3>
      {expanded && ticket.description && (
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">
          {ticket.description}
        </p>
      )}
    </div>
  );
}
