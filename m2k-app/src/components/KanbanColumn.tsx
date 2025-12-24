import type { Ticket } from "../types";
import { TicketCard } from "./TicketCard";

interface Props {
  title: string;
  tickets: Ticket[];
}

export function KanbanColumn({ title, tickets }: Props) {
  return (
    <div className="flex flex-col bg-[var(--geist-accents-1)] rounded-lg overflow-hidden border border-[var(--geist-accents-2)] max-h-[300px] md:max-h-none md:h-full">
      <div className="px-3 md:px-4 py-2 md:py-3 border-b border-[var(--geist-accents-2)] flex items-center justify-between shrink-0">
        <span className="font-medium text-sm md:text-base">{title}</span>
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
