import { create } from "zustand";
import type { Ticket, Epic } from "../types";

export type ViewMode = "kanban" | "prd" | "smart" | "settings";
export type PrdDocType = "epic" | "ticket";

interface PrdState {
  mode: "create" | "edit";
  docType: PrdDocType;
  content: string;
  editingPath: string | null;
}

export interface GeneratedTicket {
  id: string;
  title: string;
  description: string;
  criteria: string[];
  technicalNotes: string;
  dependencies: string;
  testing: string;
}

export interface GeneratedEpic {
  id: string;
  title: string;
  scope: string;
  tickets: GeneratedTicket[];
}

export type SmartModePhase = "input" | "generating" | "preview";

interface SmartModeState {
  phase: SmartModePhase;
  requirements: string;
  generatedEpic: GeneratedEpic | null;
  error: string | null;
}

export type ExecutionStatus = "idle" | "running" | "paused" | "completed" | "error";

export interface ExecutionState {
  status: ExecutionStatus;
  epicId: string | null;
  currentTicketId: string | null;
  completedTickets: string[];
  totalTickets: number;
  output: string[];
  error: string | null;
  startedAt: number | null;
}

interface AppState {
  tickets: Ticket[];
  epics: Epic[];
  selectedEpic: string | null;
  projectPath: string | null;
  viewMode: ViewMode;
  prdState: PrdState;
  smartModeState: SmartModeState;
  executionState: ExecutionState;
  setTickets: (tickets: Ticket[]) => void;
  setEpics: (epics: Epic[]) => void;
  setSelectedEpic: (epicId: string | null) => void;
  setProjectPath: (path: string | null) => void;
  filterByEpic: (epicId: string | null) => Ticket[];
  setViewMode: (mode: ViewMode) => void;
  setPrdState: (state: Partial<PrdState>) => void;
  resetPrdState: () => void;
  setSmartModeState: (state: Partial<SmartModeState>) => void;
  resetSmartModeState: () => void;
  setExecutionState: (state: Partial<ExecutionState>) => void;
  resetExecutionState: () => void;
  addExecutionOutput: (line: string) => void;
}

const defaultPrdState: PrdState = {
  mode: "create",
  docType: "ticket",
  content: "",
  editingPath: null,
};

const defaultSmartModeState: SmartModeState = {
  phase: "input",
  requirements: "",
  generatedEpic: null,
  error: null,
};

const defaultExecutionState: ExecutionState = {
  status: "idle",
  epicId: null,
  currentTicketId: null,
  completedTickets: [],
  totalTickets: 0,
  output: [],
  error: null,
  startedAt: null,
};

export const useAppStore = create<AppState>((set, get) => ({
  tickets: [],
  epics: [],
  selectedEpic: null,
  projectPath: null,
  viewMode: "kanban",
  prdState: { ...defaultPrdState },
  smartModeState: { ...defaultSmartModeState },
  executionState: { ...defaultExecutionState },
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
  setSmartModeState: (state) => set((s) => ({ smartModeState: { ...s.smartModeState, ...state } })),
  resetSmartModeState: () => set({ smartModeState: { ...defaultSmartModeState } }),
  setExecutionState: (state) => set((s) => ({ executionState: { ...s.executionState, ...state } })),
  resetExecutionState: () => set({ executionState: { ...defaultExecutionState } }),
  addExecutionOutput: (line) => set((s) => ({
    executionState: {
      ...s.executionState,
      output: [...s.executionState.output.slice(-500), line], // Keep last 500 lines
    },
  })),
}));
