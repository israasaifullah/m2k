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
};

export function TicketCard({ ticket }: Props) {
  const [expanded, setExpanded] = useState(false);
  const epicColor = epicColors[ticket.epic] || "bg-gray-500";

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-lg shadow p-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
        <span
          className={`${epicColor} text-white text-xs px-1.5 py-0.5 rounded shrink-0`}
        >
          {ticket.epic}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
          {ticket.id}
        </span>
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
