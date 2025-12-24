import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "../lib/store";
import { loadConfig, saveConfig } from "../lib/config";
import type { Ticket, Epic } from "../types";

export function useProjectLoader() {
  const setProjectPath = useAppStore((s) => s.setProjectPath);
  const setTickets = useAppStore((s) => s.setTickets);
  const setEpics = useAppStore((s) => s.setEpics);
  const projectPath = useAppStore((s) => s.projectPath);

  const loadProject = async (path: string) => {
    try {
      const [tickets, epics] = await Promise.all([
        invoke<Ticket[]>("parse_tickets", { path }),
        invoke<Epic[]>("parse_epics", { path }),
      ]);
      setTickets(tickets);
      setEpics(epics);
      await invoke("start_watcher", { path });
    } catch (e) {
      console.error("Failed to load project:", e);
    }
  };

  const selectFolder = async () => {
    const selected = await open({ directory: true });
    if (selected) {
      setProjectPath(selected);
      const currentConfig = await loadConfig();
      await saveConfig({ ...currentConfig, project_path: selected });
      await loadProject(selected);
    }
  };

  useEffect(() => {
    loadConfig().then((config) => {
      if (config.project_path) {
        setProjectPath(config.project_path);
        loadProject(config.project_path);
      }
    });
  }, []);

  useEffect(() => {
    if (!projectPath) return;

    const unlisten = listen("file-change", () => {
      loadProject(projectPath);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [projectPath]);

  return { selectFolder };
}
