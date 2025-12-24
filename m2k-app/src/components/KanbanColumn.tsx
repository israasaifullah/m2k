import { Inbox, Loader2, CheckCircle2 } from "lucide-react";
import type { Ticket } from "../types";
import { TicketCard } from "./TicketCard";

const columnIcons: Record<string, React.ReactNode> = {
  Backlog: <Inbox size={16} aria-hidden="true" />,
  "In Progress": <Loader2 size={16} className="text-[var(--geist-success)]" aria-hidden="true" />,
  Done: <CheckCircle2 size={16} className="text-emerald-500" aria-hidden="true" />,
};

interface Props {
  title: string;
  tickets: Ticket[];
}

export function KanbanColumn({ title, tickets }: Props) {
  return (
    <section
      className="flex flex-col bg-[var(--geist-accents-1)] rounded-lg overflow-hidden border border-[var(--geist-accents-2)] max-h-[300px] md:max-h-none md:h-full w-[300px] shrink-0"
      aria-label={`${title} column with ${tickets.length} tickets`}
    >
      <header className="px-3 md:px-4 py-2 md:py-3 border-b border-[var(--geist-accents-2)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {columnIcons[title]}
          <h2 className="font-medium text-sm md:text-base">{title}</h2>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full bg-[var(--geist-accents-2)] text-[var(--geist-accents-6)]"
          aria-label={`${tickets.length} tickets`}
        >
          {tickets.length}
        </span>
      </header>
      <ul className="flex-1 overflow-y-auto p-2 space-y-2 list-none" role="list" aria-label={`${title} tickets`}>
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            <TicketCard ticket={ticket} />
          </li>
        ))}
      </ul>
    </section>
  );
}
