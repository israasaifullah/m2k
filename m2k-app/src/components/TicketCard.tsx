import { useState } from "react";
import type { Ticket } from "../types";

interface Props {
  ticket: Ticket;
}

const epicColors: Record<string, string> = {
  "EPIC-001": "bg-blue-600",
  "EPIC-002": "bg-emerald-600",
  "EPIC-003": "bg-violet-600",
  "EPIC-004": "bg-orange-600",
  "EPIC-005": "bg-pink-600",
  "EPIC-006": "bg-cyan-600",
  "EPIC-007": "bg-rose-600",
  "EPIC-008": "bg-amber-600",
};

function PulsingDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--geist-success)] opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--geist-success)]"></span>
    </span>
  );
}

export function TicketCard({ ticket }: Props) {
  const [expanded, setExpanded] = useState(false);
  const epicColor = epicColors[ticket.epic] || "bg-[var(--geist-accents-4)]";
  const isInProgress = ticket.status === "in_progress";

  const baseClass = "rounded-lg p-3 cursor-pointer transition-all duration-200 ease-out animate-fade-in hover:scale-[1.01] hover:shadow-lg";
  const cardClass = isInProgress
    ? `${baseClass} bg-[var(--geist-accents-1)] hover:bg-[var(--geist-accents-2)] border border-[var(--geist-success)] animate-pulse-subtle`
    : `${baseClass} bg-[var(--geist-background)] hover:bg-[var(--geist-accents-1)] border border-[var(--geist-accents-2)]`;

  return (
    <div className={cardClass} onClick={() => setExpanded(!expanded)}>
      <div className="flex items-center gap-2 flex-wrap">
        {isInProgress && <PulsingDot />}
        <span className={`${epicColor} text-white text-xs px-1.5 py-0.5 rounded font-medium transition-transform hover:scale-105`}>
          {ticket.epic}
        </span>
        <span className="text-xs text-[var(--geist-accents-5)] font-mono">
          {ticket.id}
        </span>
        {isInProgress && (
          <span className="ml-auto text-xs text-[var(--geist-success)] font-medium animate-pulse">
            Working...
          </span>
        )}
      </div>
      <h3 className="font-medium mt-2 text-sm">{ticket.title}</h3>
      {expanded && ticket.description && (
        <p className="text-xs text-[var(--geist-accents-5)] mt-2 animate-slide-up">
          {ticket.description}
        </p>
      )}
    </div>
  );
}
