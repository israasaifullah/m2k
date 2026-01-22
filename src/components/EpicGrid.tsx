import { useAppStore } from "../lib/store";
import { BookOpen, CheckCircle2, Circle, Pencil, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { confirm } from "@tauri-apps/plugin-dialog";

export function EpicGrid() {
  const epics = useAppStore((s) => s.epics);
  const tickets = useAppStore((s) => s.tickets);
  const setSelectedEpic = useAppStore((s) => s.setSelectedEpic);
  const setEpics = useAppStore((s) => s.setEpics);
  const setPrdState = useAppStore((s) => s.setPrdState);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const projectPath = useAppStore((s) => s.projectPath);

  const sortedEpics = [...epics].sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(b.id.replace(/\D/g, ""), 10) || 0;
    return numA - numB;
  });

  const getEpicStats = (epicId: string) => {
    const epicTickets = tickets.filter((t) => t.epic === epicId);
    const total = epicTickets.length;
    const completed = epicTickets.filter((t) => t.status === "done").length;
    return { total, completed };
  };

  const handleEpicClick = (epicId: string) => {
    setSelectedEpic(epicId);
  };

  const handleEdit = async (e: React.MouseEvent, epic: typeof epics[0]) => {
    e.stopPropagation();
    if (!projectPath) return;

    // Find the epic file path
    const epicPath = `${projectPath}/epics/${epic.id}-${epic.title.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-")}.md`;

    try {
      const content = await invoke<string>("read_markdown_file", { path: epicPath });
      setPrdState({
        mode: "edit",
        docType: "epic",
        content,
        editingPath: epicPath,
      });
      setViewMode("prd");
    } catch {
      // Try alternative path format
      try {
        const files = await invoke<string[]>("list_epic_files", { projectPath });
        const epicFile = files.find(f => f.includes(epic.id));
        if (epicFile) {
          const content = await invoke<string>("read_markdown_file", { path: epicFile });
          setPrdState({
            mode: "edit",
            docType: "epic",
            content,
            editingPath: epicFile,
          });
          setViewMode("prd");
        }
      } catch (err) {
        console.error("Failed to read epic:", err);
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, epic: typeof epics[0]) => {
    e.stopPropagation();
    if (!projectPath) return;

    const confirmed = await confirm(
      `Delete ${epic.id}? This will also delete all associated tickets.`,
      { title: "Delete Epic", kind: "warning" }
    );

    if (!confirmed) return;

    try {
      // Find and delete the epic file
      const files = await invoke<string[]>("list_epic_files", { projectPath });
      const epicFile = files.find(f => f.includes(epic.id));
      if (epicFile) {
        await invoke("delete_markdown_file", { path: epicFile });
      }

      // Remove from store
      setEpics(epics.filter(e => e.id !== epic.id));
    } catch (err) {
      console.error("Failed to delete epic:", err);
    }
  };

  if (epics.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <BookOpen size={32} className="mx-auto mb-2 text-[var(--geist-accents-4)]" />
          <p className="text-xs text-[var(--geist-accents-4)]">No epics found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {sortedEpics.map((epic) => {
            const stats = getEpicStats(epic.id);
            const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
            const isComplete = stats.total > 0 && stats.completed === stats.total;

            return (
              <div
                key={epic.id}
                onClick={() => handleEpicClick(epic.id)}
                className="group text-left p-2 rounded hover:bg-[var(--geist-accents-1)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  {isComplete ? (
                    <CheckCircle2 size={14} className="text-[var(--monokai-green)] flex-shrink-0" />
                  ) : (
                    <Circle size={14} className="text-[var(--geist-accents-4)] flex-shrink-0" />
                  )}
                  <span className="text-[10px] text-[var(--geist-accents-4)] font-mono">{epic.id}</span>
                  <span className="text-[10px] text-[var(--geist-accents-4)]">{stats.completed}/{stats.total}</span>
                  <div className="flex items-center gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleEdit(e, epic)}
                      className="p-1 text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, epic)}
                      className="p-1 text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors"
                      title="Delete"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
                <h3 className="text-xs text-[var(--geist-foreground)] line-clamp-1 mb-1">
                  {epic.title}
                </h3>
                <div className="h-0.5 bg-[var(--geist-accents-2)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--monokai-green)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
