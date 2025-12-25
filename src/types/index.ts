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

export interface Epic {
  id: string;
  title: string;
  scope: string;
  tickets: string[];
}
