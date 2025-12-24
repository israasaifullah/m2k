import { create } from "zustand";
import type { Ticket, Epic } from "../types";

export type ViewMode = "kanban" | "prd";
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
  setTickets: (tickets: Ticket[]) => void;
  setEpics: (epics: Epic[]) => void;
  setSelectedEpic: (epicId: string | null) => void;
  setProjectPath: (path: string | null) => void;
  filterByEpic: (epicId: string | null) => Ticket[];
  setViewMode: (mode: ViewMode) => void;
  setPrdState: (state: Partial<PrdState>) => void;
  resetPrdState: () => void;
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
}));
