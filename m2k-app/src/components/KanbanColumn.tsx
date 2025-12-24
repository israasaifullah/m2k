import type { Ticket } from "../types";
import { TicketCard } from "./TicketCard";

interface Props {
  title: string;
  tickets: Ticket[];
}

export function KanbanColumn({ title, tickets }: Props) {
  return (
    <div className="flex flex-col bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-gray-200 dark:bg-gray-700 font-semibold flex items-center justify-between">
        <span>{title}</span>
        <span className="bg-gray-300 dark:bg-gray-600 text-sm px-2 py-0.5 rounded-full">
          {tickets.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  );
}
