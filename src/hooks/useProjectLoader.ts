import { useEffect, useCallback, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open, confirm } from "@tauri-apps/plugin-dialog";
import { useAppStore, RegisteredProject } from "../lib/store";
import { loadConfig, saveConfig } from "../lib/config";
import { debounce } from "../lib/debounce";
import type { Ticket, Epic } from "../types";

export function useProjectLoader() {
  const setProjectPath = useAppStore((s) => s.setProjectPath);
  const setTickets = useAppStore((s) => s.setTickets);
  const setEpics = useAppStore((s) => s.setEpics);
  const projectPath = useAppStore((s) => s.projectPath);
  const setRegisteredProjects = useAppStore((s) => s.setRegisteredProjects);
  const setActiveProjectId = useAppStore((s) => s.setActiveProjectId);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const setProjectLoading = useAppStore((s) => s.setProjectLoading);
  const prevSidebarCollapsed = useRef<boolean | null>(null);

  const validateProjectPath = useCallback(async (path: string): Promise<boolean> => {
    try {
      // Path already includes .m2k suffix, just check if it exists
      return await invoke<boolean>("path_exists", { path });
    } catch {
      return false;
    }
  }, []);

  const loadProject = useCallback(async (path: string): Promise<{ success: boolean; error?: string }> => {
    try {
      path = `${path}`;
      if (!path.endsWith("/.m2k")) {
        path = `${path}/.m2k`;
      }
      const isValid = await validateProjectPath(path);
      if (!isValid) {
        return { success: false, error: `Project not found or missing .m2k folder: ${path}` };
      }

      const m2kPath = `${path}`;
      console.log("Loading project from:", m2kPath);

      // Initialize project counters if not already initialized
      try {
        await invoke("init_project_counters", { projectPath: m2kPath });
      } catch (e) {
        console.warn("Failed to initialize project counters:", e);
      }

      // Sync MD files to database
      try {
        console.log("Syncing project data to database...");
        await invoke("sync_md_to_db", { projectPath: m2kPath });
        console.log("Database sync complete");
      } catch (e) {
        console.warn("Failed to sync MD to database:", e);
      }

      const [tickets, epics] = await Promise.all([
        invoke<Ticket[]>("parse_tickets", { path: m2kPath }),
        invoke<Epic[]>("parse_epics", { path: m2kPath }),
      ]);
      setTickets(tickets);
      setEpics(epics);
      await invoke("start_watcher", { path: m2kPath });
      return { success: true };
    } catch (e) {
      console.error("Failed to load project:", e);
      return { success: false, error: String(e) };
    }
  }, [setTickets, setEpics, validateProjectPath]);

  const loadRegisteredProjects = useCallback(async () => {
    try {
      const projects = await invoke<RegisteredProject[]>("get_all_projects");
      setRegisteredProjects(projects);
      return projects;
    } catch (e) {
      console.error("Failed to load registered projects:", e);
      return [];
    }
  }, [setRegisteredProjects]);

  const registerProject = useCallback(async (path: string, name?: string): Promise<RegisteredProject | null> => {
    try {
      // Check if project already registered in DB
      const existsInDb = await invoke<boolean>("project_path_exists", { path: `${path}/.m2k` });
      if (existsInDb) {
        console.error("Project already registered");
        return null;
      }

      // Check if .m2k folder exists on filesystem, create if not
      const m2kPath = `${path}/.m2k`;
      const folderExists = await invoke<boolean>("path_exists", { path: m2kPath });
      if (!folderExists) {
        const shouldCreate = await confirm(
          "No .m2k folder found in this project. Would you like to create the M2K project structure?",
          { title: "Initialize M2K Project", kind: "info" }
        );
        if (!shouldCreate) {
          return null;
        }
        console.log("Creating .m2k folder structure...");
        await invoke<string>("init_m2k_folder", { projectPath: path });
      }

      // Extract folder name if no name provided
      const projectName = name || path.split("/").pop() || "Untitled";

      // Add to database
      const project = await invoke<RegisteredProject>("add_project", {
        name: projectName,
        path: m2kPath,
      });

      // Refresh projects list
      await loadRegisteredProjects();

      return project;
    } catch (e) {
      console.error("Failed to register project:", e);
      return null;
    }
  }, [loadRegisteredProjects]);

  const switchToProject = useCallback(async (project: RegisteredProject): Promise<{ success: boolean; error?: string }> => {
    try {
      setProjectLoading(true);

      // Update last accessed
      await invoke("update_project_last_accessed", { id: project.id });

      // Save active project to app state
      await invoke("set_app_state_value", {
        key: "active_project_id",
        value: String(project.id)
      });

      // Update local state
      setProjectPath(project.path);
      setActiveProjectId(project.id);

      // Load the project
      const result = await loadProject(project.path);
      if (!result.success) {
        setProjectLoading(false);
        return result;
      }

      // Refresh projects to update last_accessed order
      await loadRegisteredProjects();

      setProjectLoading(false);
      return { success: true };
    } catch (e) {
      console.error("Failed to switch project:", e);
      setProjectLoading(false);
      return { success: false, error: String(e) };
    }
  }, [setProjectPath, setActiveProjectId, loadProject, loadRegisteredProjects, setProjectLoading]);

  const removeProject = useCallback(async (project: RegisteredProject) => {
    try {
      await invoke("remove_project", { id: project.id });

      // If removing active project, clear state
      const activeId = useAppStore.getState().activeProjectId;
      if (activeId === project.id) {
        setProjectPath(null);
        setActiveProjectId(null);
        setTickets([]);
        setEpics([]);
      }

      // Refresh projects list
      await loadRegisteredProjects();
    } catch (e) {
      console.error("Failed to remove project:", e);
    }
  }, [setProjectPath, setActiveProjectId, setTickets, setEpics, loadRegisteredProjects]);

  const renameProject = useCallback(async (project: RegisteredProject, newName: string) => {
    try {
      await invoke("rename_project", { id: project.id, newName });
      // Refresh projects list
      await loadRegisteredProjects();
    } catch (e) {
      console.error("Failed to rename project:", e);
    }
  }, [loadRegisteredProjects]);

  const clearActiveProject = useCallback(async () => {
    try {
      // Clear from app state storage
      await invoke("set_app_state_value", {
        key: "active_project_id",
        value: ""
      });
      // Clear local state
      setProjectPath(null);
      setActiveProjectId(null);
      setTickets([]);
      setEpics([]);
    } catch (e) {
      console.error("Failed to clear active project:", e);
    }
  }, [setProjectPath, setActiveProjectId, setTickets, setEpics]);

  const selectFolder = useCallback(async () => {
    const selected = await open({ directory: true });
    if (selected) {
      // Register the project
      const project = await registerProject(selected);

      if (project) {
        await switchToProject(project);
      } else {
        // If already registered, just switch to it
        const existing = await invoke<RegisteredProject | null>("get_project_by_path", { path: selected });
        if (existing) {
          await switchToProject(existing);
        }
      }

      // Also save to config for backwards compatibility
      const currentConfig = await loadConfig();
      await saveConfig({ ...currentConfig, project_path: selected });
    }
  }, [registerProject, switchToProject]);

  // Initialize: load registered projects and restore active project
  useEffect(() => {
    const init = async () => {
      // Load all registered projects
      const projects = await loadRegisteredProjects();

      // Restore sidebar state from app_state first
      try {
        const sidebarState = await invoke<string | null>("get_app_state_value", { key: "sidebar_collapsed" });
        if (sidebarState !== null) {
          setSidebarCollapsed(sidebarState === "true");
          prevSidebarCollapsed.current = sidebarState === "true";
        } else {
          // Fallback to config
          const config = await loadConfig();
          if (config.sidebar_collapsed !== undefined) {
            setSidebarCollapsed(config.sidebar_collapsed);
            prevSidebarCollapsed.current = config.sidebar_collapsed;
          }
        }
      } catch (e) {
        console.error("Failed to restore sidebar state:", e);
      }

      // Try to restore active project from app state
      try {
        const activeIdStr = await invoke<string | null>("get_app_state_value", { key: "active_project_id" });
        if (activeIdStr && activeIdStr !== "") {
          const activeId = parseInt(activeIdStr, 10);
          const activeProject = projects.find(p => p.id === activeId);
          if (activeProject) {
            // Validate project path exists
            const isValid = await validateProjectPath(activeProject.path);
            if (isValid) {
              setProjectPath(activeProject.path);
              setActiveProjectId(activeId);
              await loadProject(activeProject.path);
              return;
            } else {
              // Project folder missing - show warning and clear
              console.warn(`Last active project not found: ${activeProject.path}`);
              // Don't auto-remove, user might want to reconnect later
            }
          }
        }
      } catch (e) {
        console.error("Failed to restore active project:", e);
      }

      // Fallback to config
      const config = await loadConfig();
      if (config.project_path) {
        const isValid = await validateProjectPath(config.project_path);
        if (isValid) {
          setProjectPath(config.project_path);
          await loadProject(config.project_path);

          // Check if this project is registered, if not register it
          const existing = await invoke<RegisteredProject | null>("get_project_by_path", { path: config.project_path });
          if (existing) {
            setActiveProjectId(existing.id);
          } else {
            // Auto-register from config
            const project = await registerProject(config.project_path);
            if (project) {
              setActiveProjectId(project.id);
            }
          }
        }
      }
    };

    init();
  }, []);

  // Persist sidebar state when changed
  useEffect(() => {
    // Skip initial render and when value hasn't changed
    if (prevSidebarCollapsed.current === null) {
      prevSidebarCollapsed.current = sidebarCollapsed;
      return;
    }
    if (prevSidebarCollapsed.current === sidebarCollapsed) {
      return;
    }
    prevSidebarCollapsed.current = sidebarCollapsed;

    const persistSidebar = async () => {
      try {
        await invoke("set_app_state_value", {
          key: "sidebar_collapsed",
          value: String(sidebarCollapsed)
        });
      } catch (e) {
        console.error("Failed to persist sidebar state:", e);
      }
    };
    persistSidebar();
  }, [sidebarCollapsed]);

  // Debounced reload to prevent excessive reloads
  const debouncedLoadProject = useMemo(
    () => debounce((path: string) => {
      console.log("Debounced reload triggered");
      loadProject(path);
    }, 1000),
    [loadProject]
  );

  // Debounced stats sync
  const debouncedSyncStats = useMemo(
    () => debounce(async (path: string) => {
      console.log("Syncing stats from files...");
      try {
        await invoke("sync_stats_from_files", { projectPath: path });
        console.log("Stats synced successfully");
      } catch (e) {
        console.error("Failed to sync stats:", e);
      }
    }, 1000),
    []
  );

  // Listen for file changes
  useEffect(() => {
    if (!projectPath) return;

    const unlisten = listen("file-change", () => {
      console.log("File change detected, scheduling reload and stats sync...");
      debouncedLoadProject(projectPath);
      debouncedSyncStats(projectPath);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [projectPath, debouncedLoadProject, debouncedSyncStats]);

  return {
    selectFolder,
    loadProject,
    loadRegisteredProjects,
    registerProject,
    switchToProject,
    removeProject,
    renameProject,
    clearActiveProject,
    validateProjectPath
  };
}
