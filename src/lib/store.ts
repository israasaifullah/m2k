import { create } from "zustand";
import type { Ticket, Epic } from "../types";

export interface RegisteredProject {
  id: number;
  name: string;
  path: string;
  created_at: string;
  last_accessed: string;
}

export type ViewMode = "kanban" | "prd" | "settings" | "resources";
export type PrdDocType = "epic" | "ticket";

interface PrdState {
  mode: "create" | "edit";
  docType: PrdDocType;
  content: string;
  editingPath: string | null;
}


interface AppState {
  tickets: Ticket[];
  epics: Epic[];
  selectedEpic: string | null;
  projectPath: string | null;
  viewMode: ViewMode;
  prdState: PrdState;
  vimMode: boolean;
  registeredProjects: RegisteredProject[];
  activeProjectId: number | null;
  sidebarCollapsed: boolean;
  saveCallback: (() => void) | null;
  projectLoading: boolean;
  sidebarWidth: number;
  resourcePanelWidth: number;
  setTickets: (tickets: Ticket[]) => void;
  setEpics: (epics: Epic[]) => void;
  setSelectedEpic: (epicId: string | null) => void;
  setProjectPath: (path: string | null) => void;
  filterByEpic: (epicId: string | null) => Ticket[];
  setViewMode: (mode: ViewMode) => void;
  setPrdState: (state: Partial<PrdState>) => void;
  resetPrdState: () => void;
  setVimMode: (enabled: boolean) => void;
  setRegisteredProjects: (projects: RegisteredProject[]) => void;
  setActiveProjectId: (id: number | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSaveCallback: (callback: (() => void) | null) => void;
  triggerSave: () => void;
  setProjectLoading: (loading: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setResourcePanelWidth: (width: number) => void;
}

const defaultPrdState: PrdState = {
  mode: "create",
  docType: "ticket",
  content: "",
  editingPath: null,
};


export const useAppStore = create<AppState>((set, get) => ({
  tickets: [],
  epics: [],
  selectedEpic: null,
  projectPath: null,
  viewMode: "kanban",
  prdState: { ...defaultPrdState },
  vimMode: true,
  registeredProjects: [],
  activeProjectId: null,
  sidebarCollapsed: false,
  saveCallback: null,
  projectLoading: false,
  sidebarWidth: 176,
  resourcePanelWidth: 220,
  setTickets: (tickets) => set({ tickets }),
  setEpics: (epics) => set({ epics }),
  setSelectedEpic: (epicId) => set({ selectedEpic: epicId }),
  setProjectPath: (path) => set({ projectPath: path }),
  filterByEpic: (epicId) => {
    const { tickets } = get();
    if (!epicId) return tickets;
    return tickets.filter((t) => t.epic === epicId);
  },
  setViewMode: (mode) => set({ viewMode: mode }),
  setPrdState: (state) => set((s) => ({ prdState: { ...s.prdState, ...state } })),
  resetPrdState: () => set({ prdState: { ...defaultPrdState } }),
  setVimMode: (enabled) => set({ vimMode: enabled }),
  setRegisteredProjects: (projects) => set({ registeredProjects: projects }),
  setActiveProjectId: (id) => set({ activeProjectId: id }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setSaveCallback: (callback) => set({ saveCallback: callback }),
  triggerSave: () => {
    const { saveCallback } = get();
    if (saveCallback) {
      saveCallback();
    }
  },
  setProjectLoading: (loading) => set({ projectLoading: loading }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setResourcePanelWidth: (width) => set({ resourcePanelWidth: width }),
}));
