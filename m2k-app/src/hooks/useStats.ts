import { useMemo } from "react";
import { useAppStore } from "../lib/store";

export interface AppStats {
  projectPath: string | null;
  projectName: string | null;
  totalEpics: number;
  completedEpics: number;
  pendingEpics: number;
  epicCompletionPercent: number;
  totalTickets: number;
  backlogTickets: number;
  inProgressTickets: number;
  doneTickets: number;
  ticketCompletionPercent: number;
}

export function useStats(): AppStats {
  const projectPath = useAppStore((s) => s.projectPath);
  const epics = useAppStore((s) => s.epics);
  const tickets = useAppStore((s) => s.tickets);

  return useMemo(() => {
    // Project name from path
    const projectName = projectPath
      ? projectPath.split("/").filter(Boolean).pop() || null
      : null;

    // Epic stats - count by checking if all tickets are done
    const epicStats = epics.map((epic) => {
      const epicTickets = tickets.filter((t) => t.epic === epic.id);
      const allDone = epicTickets.length > 0 && epicTickets.every((t) => t.status === "done");
      return { ...epic, isComplete: allDone };
    });

    const completedEpics = epicStats.filter((e) => e.isComplete).length;
    const pendingEpics = epicStats.filter((e) => !e.isComplete).length;
    const epicCompletionPercent = epics.length > 0
      ? Math.round((completedEpics / epics.length) * 100)
      : 0;

    // Ticket stats
    const backlogTickets = tickets.filter((t) => t.status === "backlog").length;
    const inProgressTickets = tickets.filter((t) => t.status === "in_progress").length;
    const doneTickets = tickets.filter((t) => t.status === "done").length;
    const ticketCompletionPercent = tickets.length > 0
      ? Math.round((doneTickets / tickets.length) * 100)
      : 0;

    return {
      projectPath,
      projectName,
      totalEpics: epics.length,
      completedEpics,
      pendingEpics,
      epicCompletionPercent,
      totalTickets: tickets.length,
      backlogTickets,
      inProgressTickets,
      doneTickets,
      ticketCompletionPercent,
    };
  }, [projectPath, epics, tickets]);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return num.toString();
}
