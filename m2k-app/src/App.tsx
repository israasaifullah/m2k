import "./App.css";
import { useEffect } from "react";
import { KanbanBoard } from "./components/KanbanBoard";
import { PRDMode } from "./components/PRDMode";
import { SmartMode } from "./components/SmartMode";
import { SettingsPage } from "./components/SettingsPage";
import { ResourceBoard } from "./components/ResourceBoard";
import { Terminal } from "./components/Terminal";
import { Sidebar } from "./components/Sidebar";
import { useAppStore } from "./lib/store";
import { useProjectLoader } from "./hooks/useProjectLoader";

function App() {
  const projectPath = useAppStore((s) => s.projectPath);
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const { selectFolder } = useProjectLoader();

  // Keyboard shortcut: Cmd/Ctrl+, for settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setViewMode("settings");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setViewMode]);

  if (!projectPath) {
    return (
      <main className="h-screen flex items-center justify-center bg-[var(--geist-background)]" role="main" aria-label="Welcome screen">
        <div className="text-center">
          <h1 className="text-3xl font-semibold mb-4 text-[var(--geist-foreground)]">
            M2K
          </h1>
          <p className="text-[var(--geist-accents-5)] mb-8">
            Select a project folder to get started
          </p>
          <button
            onClick={selectFolder}
            className="px-6 py-2.5 bg-[var(--geist-foreground)] text-[var(--geist-background)] rounded-lg font-medium hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-2 focus:ring-offset-[var(--geist-background)]"
            aria-label="Select project folder"
          >
            Select Folder
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen flex bg-[var(--geist-background)] text-[var(--geist-foreground)]" role="main" aria-label="Kanban board application">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 min-h-0" role="region" aria-label={viewMode === "kanban" ? "Kanban board" : viewMode === "prd" ? "PRD editor" : viewMode === "smart" ? "Smart Mode" : viewMode === "resources" ? "Resources" : "Settings"}>
          {viewMode === "kanban" && <KanbanBoard />}
          {viewMode === "prd" && <PRDMode />}
          {viewMode === "smart" && <SmartMode />}
          {viewMode === "resources" && <ResourceBoard />}
          {viewMode === "settings" && <SettingsPage />}
        </div>
        <div className="border-t border-[var(--geist-accents-2)]">
          <Terminal />
        </div>
      </div>
    </main>
  );
}

export default App;
