import { create } from "zustand";
import type { Ticket, Epic } from "../types";

interface AppState {
  tickets: Ticket[];
  epics: Epic[];
  selectedEpic: string | null;
  projectPath: string | null;
  setTickets: (tickets: Ticket[]) => void;
  setEpics: (epics: Epic[]) => void;
  setSelectedEpic: (epicId: string | null) => void;
  setProjectPath: (path: string | null) => void;
  filterByEpic: (epicId: string | null) => Ticket[];
}

export const useAppStore = create<AppState>((set, get) => ({
  tickets: [],
  epics: [],
  selectedEpic: null,
  projectPath: null,
  setTickets: (tickets) => set({ tickets }),
  setEpics: (epics) => set({ epics }),
  setSelectedEpic: (epicId) => set({ selectedEpic: epicId }),
  setProjectPath: (path) => set({ projectPath: path }),
  filterByEpic: (epicId) => {
    const { tickets } = get();
    if (!epicId) return tickets;
    return tickets.filter((t) => t.epic === epicId);
  },
}));
