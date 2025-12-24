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
      <main className="h-screen flex items-center justify-center bg-[var(--geist-background)]">
        <div className="text-center">
          <h1 className="text-3xl font-semibold mb-4 text-[var(--geist-foreground)]">
            M2K
          </h1>
          <p className="text-[var(--geist-accents-5)] mb-8">
            Select a project folder to get started
          </p>
          <button
            onClick={selectFolder}
            className="px-6 py-2.5 bg-[var(--geist-foreground)] text-[var(--geist-background)] rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Select Folder
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col bg-[var(--geist-background)] text-[var(--geist-foreground)]">
      <header className="px-4 py-3 border-b border-[var(--geist-accents-2)] flex items-center justify-between">
        <h1 className="text-lg font-semibold">M2K</h1>
        <div className="flex items-center gap-4">
          <EpicFilter />
          <button
            onClick={selectFolder}
            className="px-3 py-1.5 text-sm border border-[var(--geist-accents-3)] rounded-md hover:bg-[var(--geist-accents-1)] transition-colors"
          >
            Change Folder
          </button>
        </div>
      </header>
      <div className="flex-1 min-h-0">
        <KanbanBoard />
      </div>
    </main>
  );
}

export default App;
