import { Inbox, Loader2, CheckCircle2, Plus } from "lucide-react";
import type { Ticket } from "../types";
import { TicketCard } from "./TicketCard";

const columnIcons: Record<string, React.ReactNode> = {
  Backlog: <Inbox size={14} aria-hidden="true" />,
  "In Progress": <Loader2 size={14} className="text-[var(--monokai-orange)]" aria-hidden="true" />,
  Done: <CheckCircle2 size={14} className="text-[var(--monokai-green)]" aria-hidden="true" />,
};

interface Props {
  title: string;
  tickets: Ticket[];
  onAddTicket?: () => void;
}

export function KanbanColumn({ title, tickets, onAddTicket }: Props) {
  return (
    <section
      className="flex flex-col bg-transparent overflow-hidden max-h-[300px] md:max-h-none md:h-full w-[280px] shrink-0"
      aria-label={`${title} column with ${tickets.length} tickets`}
    >
      <header className="px-2 py-1 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-[var(--geist-accents-4)]">
          {columnIcons[title]}
          <h2 className="font-medium text-xs">{title}</h2>
          <span className="text-[10px] text-[var(--geist-accents-4)]">{tickets.length}</span>
        </div>
        {onAddTicket && (
          <button
            onClick={onAddTicket}
            className="p-1 text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors"
            title={`Add ticket to ${title}`}
            aria-label={`Add ticket to ${title}`}
          >
            <Plus size={14} />
          </button>
        )}
      </header>
      <ul className="flex-1 overflow-y-auto p-1 space-y-0.5 list-none" role="list" aria-label={`${title} tickets`}>
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            <TicketCard ticket={ticket} />
          </li>
        ))}
      </ul>
    </section>
  );
}
