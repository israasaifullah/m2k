import { useState, useEffect } from "react";
import { Play, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "../lib/store";

interface Props {
  epic: string;
}

export function EpicExecuteButton({ epic }: Props) {
  const [executing, setExecuting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [failedTasks, setFailedTasks] = useState<Set<string>>(new Set());
  const tickets = useAppStore((s) => s.tickets);
  const projectPath = useAppStore((s) => s.projectPath);

  const epicTickets = tickets.filter(
    (t) => t.epic === epic && (t.status === "backlog" || t.status === "in_progress")
  );

  useEffect(() => {
    const unlistenCompleted = listen<{ task_id: string }>("task-completed", (event) => {
      setCompletedTasks((prev) => new Set(prev).add(event.payload.task_id));
    });

    const unlistenFailed = listen<{ task_id: string; error: string }>("task-failed", (event) => {
      setFailedTasks((prev) => new Set(prev).add(event.payload.task_id));
    });

    return () => {
      unlistenCompleted.then((fn) => fn());
      unlistenFailed.then((fn) => fn());
    };
  }, []);

  const handleExecuteEpic = async () => {
    if (epicTickets.length === 0) return;

    setExecuting(true);
    setProgress({ current: 0, total: epicTickets.length });
    setCompletedTasks(new Set());
    setFailedTasks(new Set());

    for (let i = 0; i < epicTickets.length; i++) {
      const ticket = epicTickets[i];
      setProgress({ current: i + 1, total: epicTickets.length });

      try {
        const taskId = await invoke<string>("submit_claude_task", {
          prompt: ticket.description || ticket.title,
          workspacePath: projectPath || null,
          timeoutSecs: 300,
          priority: 5,
        });

        // Wait for completion or failure
        await new Promise<void>((resolve) => {
          const checkStatus = setInterval(() => {
            if (completedTasks.has(taskId) || failedTasks.has(taskId)) {
              clearInterval(checkStatus);
              resolve();
            }
          }, 500);
        });
      } catch (err) {
        console.error(`Failed to execute ${ticket.id}:`, err);
      }
    }

    setExecuting(false);
  };

  if (epicTickets.length === 0) return null;

  return (
    <div className="flex items-center">
      {executing ? (
        <div className="flex items-center gap-1 text-xs text-[var(--monokai-orange)]">
          <Loader2 size={16} className="animate-spin" />
          <span>{progress.current}/{progress.total}</span>
        </div>
      ) : (
        <button
          onClick={handleExecuteEpic}
          className="p-1.5 text-[var(--geist-accents-4)] hover:text-[var(--monokai-green)] transition-colors"
          title={`Execute ${epicTickets.length} tickets`}
        >
          <Play size={16} />
        </button>
      )}
    </div>
  );
}
