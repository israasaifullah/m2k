import "./App.css";
import { KanbanBoard } from "./components/KanbanBoard";
import { EpicFilter } from "./components/EpicFilter";
import { useAppStore } from "./lib/store";

function App() {
  const projectPath = useAppStore((s) => s.projectPath);

  if (!projectPath) {
    return (
      <main className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            M2K - Markdown to Kanban
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Select a project folder to get started
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <header className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h1 className="text-xl font-bold">M2K</h1>
        <EpicFilter />
      </header>
      <div className="flex-1 min-h-0">
        <KanbanBoard />
      </div>
    </main>
  );
}

export default App;
