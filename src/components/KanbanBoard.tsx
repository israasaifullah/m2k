import { useAppStore } from "../lib/store";
import { KanbanColumn } from "./KanbanColumn";
import { EpicFilter } from "./EpicFilter";
import { EpicExecuteButton } from "./EpicExecuteButton";
import type { Ticket } from "../types";

function sortByTicketId(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(b.id.replace(/\D/g, ""), 10) || 0;
    return numA - numB;
  });
}

function Header() {
  const selectedEpic = useAppStore((s) => s.selectedEpic);

  return (
    <div className="flex items-center justify-end gap-1 px-2 py-1 border-b border-[var(--geist-accents-2)] bg-[var(--geist-accents-1)]">
      <EpicFilter />
      {selectedEpic && (
        <>
          <div className="w-px h-4 bg-[var(--geist-accents-3)] mx-1" />
          <EpicExecuteButton epic={selectedEpic} />
        </>
      )}
    </div>
  );
}

export function KanbanBoard() {
  const tickets = useAppStore((s) => s.tickets);
  const selectedEpic = useAppStore((s) => s.selectedEpic);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const resetPrdState = useAppStore((s) => s.resetPrdState);

  const filteredTickets = selectedEpic
    ? tickets.filter((t) => t.epic === selectedEpic)
    : tickets;

  const backlog = sortByTicketId(filteredTickets.filter((t) => t.status === "backlog"));
  const inProgress = sortByTicketId(filteredTickets.filter((t) => t.status === "in_progress"));
  const done = sortByTicketId(filteredTickets.filter((t) => t.status === "done"));

  const handleAddTicketToBacklog = () => {
    resetPrdState();
    setViewMode("prd");
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <Header />
      <div className="flex justify-center gap-3 md:gap-4 p-3 md:p-4 flex-1 min-h-0 overflow-auto">
        <KanbanColumn title="Backlog" tickets={backlog} onAddTicket={selectedEpic ? handleAddTicketToBacklog : undefined} />
        <KanbanColumn title="In Progress" tickets={inProgress} />
        <KanbanColumn title="Done" tickets={done} />
      </div>
    </div>
  );
}
