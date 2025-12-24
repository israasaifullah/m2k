import type { Ticket } from "../types";
import { TicketCard } from "./TicketCard";

interface Props {
  title: string;
  tickets: Ticket[];
}

export function KanbanColumn({ title, tickets }: Props) {
  return (
    <div className="flex flex-col bg-[var(--geist-accents-1)] rounded-lg overflow-hidden border border-[var(--geist-accents-2)]">
      <div className="px-4 py-3 border-b border-[var(--geist-accents-2)] flex items-center justify-between">
        <span className="font-medium">{title}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--geist-accents-2)] text-[var(--geist-accents-6)]">
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
