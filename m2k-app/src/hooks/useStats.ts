import { useState, useEffect } from "react";
import { useAppStore } from "../lib/store";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

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

interface DBStats {
  total_epics: number;
  completed_epics: number;
  total_tickets: number;
  backlog_tickets: number;
  inprogress_tickets: number;
  done_tickets: number;
}

export function useStats(): AppStats {
  const projectPath = useAppStore((s) => s.projectPath);
  const [stats, setStats] = useState<AppStats>({
    projectPath: null,
    projectName: null,
    totalEpics: 0,
    completedEpics: 0,
    pendingEpics: 0,
    epicCompletionPercent: 0,
    totalTickets: 0,
    backlogTickets: 0,
    inProgressTickets: 0,
    doneTickets: 0,
    ticketCompletionPercent: 0,
  });

  useEffect(() => {
    if (!projectPath) {
      setStats({
        projectPath: null,
        projectName: null,
        totalEpics: 0,
        completedEpics: 0,
        pendingEpics: 0,
        epicCompletionPercent: 0,
        totalTickets: 0,
        backlogTickets: 0,
        inProgressTickets: 0,
        doneTickets: 0,
        ticketCompletionPercent: 0,
      });
      return;
    }

    const fetchStats = async () => {
      try {
        const settings = await invoke<{ project_path: string } & DBStats | null>(
          "get_project_settings",
          { projectPath }
        );

        if (!settings) {
          console.warn("No stats found for project");
          return;
        }

        const projectName = projectPath.split("/").filter(Boolean).pop() || null;

        const epicCompletionPercent = settings.total_epics > 0
          ? Math.round((settings.completed_epics / settings.total_epics) * 100)
          : 0;

        const ticketCompletionPercent = settings.total_tickets > 0
          ? Math.round((settings.done_tickets / settings.total_tickets) * 100)
          : 0;

        setStats({
          projectPath,
          projectName,
          totalEpics: settings.total_epics,
          completedEpics: settings.completed_epics,
          pendingEpics: settings.total_epics - settings.completed_epics,
          epicCompletionPercent,
          totalTickets: settings.total_tickets,
          backlogTickets: settings.backlog_tickets,
          inProgressTickets: settings.inprogress_tickets,
          doneTickets: settings.done_tickets,
          ticketCompletionPercent,
        });
      } catch (e) {
        console.error("Failed to fetch stats:", e);
      }
    };

    fetchStats();

    // Listen for file changes to refresh stats
    const unlisten = listen("file-change", () => {
      // Stats will be updated by debounced sync
      // Refetch after a delay to get updated values
      setTimeout(fetchStats, 1500);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [projectPath]);

  return stats;
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
