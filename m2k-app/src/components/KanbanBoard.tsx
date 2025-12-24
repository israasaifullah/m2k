import { useAppStore } from "../lib/store";
import { KanbanColumn } from "./KanbanColumn";

export function KanbanBoard() {
  const tickets = useAppStore((s) => s.tickets);
  const selectedEpic = useAppStore((s) => s.selectedEpic);

  const filteredTickets = selectedEpic
    ? tickets.filter((t) => t.epic === selectedEpic)
    : tickets;

  const backlog = filteredTickets.filter((t) => t.status === "backlog");
  const inProgress = filteredTickets.filter((t) => t.status === "in_progress");
  const done = filteredTickets.filter((t) => t.status === "done");

  return (
    <div className="grid grid-cols-3 gap-4 p-4 h-full min-h-0">
      <KanbanColumn title="Backlog" tickets={backlog} />
      <KanbanColumn title="In Progress" tickets={inProgress} />
      <KanbanColumn title="Done" tickets={done} />
    </div>
  );
}
