import { useAppStore } from "../lib/store";
import { KanbanColumn } from "./KanbanColumn";
import type { Ticket } from "../types";

function sortByTicketId(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(b.id.replace(/\D/g, ""), 10) || 0;
    return numA - numB;
  });
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
    <div className="grid grid-cols-3 gap-4 p-4 h-full min-h-0">
      <KanbanColumn title="Backlog" tickets={backlog} />
      <KanbanColumn title="In Progress" tickets={inProgress} />
      <KanbanColumn title="Done" tickets={done} />
    </div>
  );
}
