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
      <main className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            M2K - Markdown to Kanban
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Select a project folder to get started
          </p>
          <button
            onClick={selectFolder}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Select Folder
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <header className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h1 className="text-xl font-bold">M2K</h1>
        <div className="flex items-center gap-4">
          <EpicFilter />
          <button
            onClick={selectFolder}
            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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
