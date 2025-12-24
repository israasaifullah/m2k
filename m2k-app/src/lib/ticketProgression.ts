import { invoke } from "@tauri-apps/api/core";
import type { TicketStatus, Ticket } from "../types";

/**
 * Move a ticket to a new status folder
 */
export async function moveTicketToStatus(
  projectPath: string,
  ticketId: string,
  newStatus: TicketStatus
): Promise<void> {
  await invoke("move_ticket_to_status", {
    projectPath,
    ticketId,
    newStatus,
  });
}

/**
 * Update ticket status in the epic file
 */
export async function updateEpicTicketStatus(
  projectPath: string,
  epicId: string,
  ticketId: string,
  newStatus: string
): Promise<void> {
  await invoke("update_epic_ticket_status", {
    projectPath,
    epicId,
    ticketId,
    newStatus,
  });
}

/**
 * Start working on a ticket (move to in_progress)
 */
export async function startTicket(
  projectPath: string,
  ticket: Ticket
): Promise<void> {
  await moveTicketToStatus(projectPath, ticket.id, "in_progress");
  await updateEpicTicketStatus(projectPath, ticket.epic, ticket.id, "in_progress");
}

/**
 * Complete a ticket (move to done)
 */
export async function completeTicket(
  projectPath: string,
  ticket: Ticket
): Promise<void> {
  await moveTicketToStatus(projectPath, ticket.id, "done");
  await updateEpicTicketStatus(projectPath, ticket.epic, ticket.id, "done");
}

/**
 * Get the next backlog ticket for an epic
 */
export function getNextBacklogTicket(tickets: Ticket[], epicId: string): Ticket | null {
  const epicTickets = tickets.filter(
    (t) => t.epic === epicId && t.status === "backlog"
  );
  return epicTickets.length > 0 ? epicTickets[0] : null;
}

/**
 * Check if all tickets in an epic are done
 */
export function isEpicComplete(tickets: Ticket[], epicId: string): boolean {
  const epicTickets = tickets.filter((t) => t.epic === epicId);
  return epicTickets.length > 0 && epicTickets.every((t) => t.status === "done");
}

/**
 * Get progress stats for an epic
 */
export function getEpicProgress(tickets: Ticket[], epicId: string): {
  total: number;
  done: number;
  inProgress: number;
  backlog: number;
  percentage: number;
} {
  const epicTickets = tickets.filter((t) => t.epic === epicId);
  const done = epicTickets.filter((t) => t.status === "done").length;
  const inProgress = epicTickets.filter((t) => t.status === "in_progress").length;
  const backlog = epicTickets.filter((t) => t.status === "backlog").length;
  const total = epicTickets.length;
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

  return { total, done, inProgress, backlog, percentage };
}
