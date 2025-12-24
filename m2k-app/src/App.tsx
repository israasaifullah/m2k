import "./App.css";
import { useEffect } from "react";
import { Settings, FolderOpen, Plus, Sparkles } from "lucide-react";
import { KanbanBoard } from "./components/KanbanBoard";
import { EpicFilter } from "./components/EpicFilter";
import { StartEpicButton } from "./components/StartEpicButton";
import { PRDMode } from "./components/PRDMode";
import { SmartMode } from "./components/SmartMode";
import { SettingsPage } from "./components/SettingsPage";
import { ExecutionStatusPanel } from "./components/ExecutionStatusPanel";
import { useAppStore } from "./lib/store";
import { useProjectLoader } from "./hooks/useProjectLoader";

function App() {
  const projectPath = useAppStore((s) => s.projectPath);
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const resetPrdState = useAppStore((s) => s.resetPrdState);
  const resetSmartModeState = useAppStore((s) => s.resetSmartModeState);
  const { selectFolder } = useProjectLoader();

  const handleCreateNew = () => {
    resetPrdState();
    setViewMode("prd");
  };

  const handleSmartMode = () => {
    resetSmartModeState();
    setViewMode("smart");
  };

  const handleSettings = () => {
    setViewMode("settings");
  };

  // Keyboard shortcut: Cmd/Ctrl+, for settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        handleSettings();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    <main className="h-screen flex flex-col bg-[var(--geist-background)] text-[var(--geist-foreground)]" role="main" aria-label="Kanban board application">
      <header className="px-3 md:px-4 py-2 md:py-3 border-b border-[var(--geist-accents-2)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" role="banner">
        <h1 className="text-lg font-semibold">M2K</h1>
        <nav className="flex items-center gap-2 md:gap-4 flex-wrap" aria-label="Main controls">
          {viewMode === "kanban" && (
            <>
              <EpicFilter />
              <StartEpicButton />
            </>
          )}
          <button
            onClick={handleSmartMode}
            className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-md hover:opacity-90 transition-opacity whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] flex items-center gap-1.5"
            aria-label="Open Smart Mode for AI-powered epic generation"
          >
            <Sparkles size={14} aria-hidden="true" />
            Smart
          </button>
          <button
            onClick={handleCreateNew}
            className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm bg-[var(--geist-success)] text-white rounded-md hover:opacity-90 transition-opacity whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] flex items-center gap-1"
            aria-label="Create new epic or ticket"
          >
            <Plus size={14} aria-hidden="true" />
            New
          </button>
          <button
            onClick={selectFolder}
            className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm border border-[var(--geist-accents-3)] rounded-md hover:bg-[var(--geist-accents-1)] transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] flex items-center gap-1.5"
            aria-label="Change project folder"
          >
            <FolderOpen size={14} aria-hidden="true" />
            Folder
          </button>
          <button
            onClick={handleSettings}
            className="p-1.5 md:p-2 border border-[var(--geist-accents-3)] rounded-md hover:bg-[var(--geist-accents-1)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)]"
            aria-label="Open settings (Cmd+,)"
            title="Settings (Cmd+,)"
          >
            <Settings size={14} aria-hidden="true" />
          </button>
        </nav>
      </header>
      <div className="flex-1 min-h-0" role="region" aria-label={viewMode === "kanban" ? "Kanban board" : viewMode === "prd" ? "PRD editor" : viewMode === "smart" ? "Smart Mode" : "Settings"}>
        {viewMode === "kanban" && <KanbanBoard />}
        {viewMode === "prd" && <PRDMode />}
        {viewMode === "smart" && <SmartMode />}
        {viewMode === "settings" && <SettingsPage />}
      </div>
      <ExecutionStatusPanel />
    </main>
  );
}

export default App;
