import "./App.css";
import { KanbanBoard } from "./components/KanbanBoard";
import { EpicFilter } from "./components/EpicFilter";
import { useAppStore } from "./lib/store";
import { useProjectLoader } from "./hooks/useProjectLoader";

function App() {
  const projectPath = useAppStore((s) => s.projectPath);
  const { selectFolder } = useProjectLoader();

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
          <EpicFilter />
          <button
            onClick={selectFolder}
            className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm border border-[var(--geist-accents-3)] rounded-md hover:bg-[var(--geist-accents-1)] transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)]"
            aria-label="Change project folder"
          >
            Change Folder
          </button>
        </nav>
      </header>
      <div className="flex-1 min-h-0" role="region" aria-label="Kanban board">
        <KanbanBoard />
      </div>
    </main>
  );
}

export default App;
