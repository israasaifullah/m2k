export type TicketStatus = "backlog" | "in_progress" | "done";

export interface Ticket {
  id: string;
  title: string;
  epic: string;
  description: string;
  criteria: string[];
  status: TicketStatus;
  filePath: string;
}

export type EpicPriority = "P1" | "P2" | "P3" | "P4";

export interface Epic {
  id: string;
  title: string;
  priority: EpicPriority;
  scope: string;
  tickets: string[];
}
