import { useState, useEffect } from "react";
import { Play, Loader2, Check, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "../lib/store";

interface Props {
  epic: string;
}

export function EpicExecuteButton({ epic }: Props) {
  const [executing, setExecuting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [currentTicket, setCurrentTicket] = useState<string | null>(null);
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
      setCurrentTicket(ticket.id);
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
    setCurrentTicket(null);
  };

  if (epicTickets.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {executing ? (
        <div className="flex items-center gap-2 text-xs">
          <Loader2 size={14} className="animate-spin text-[var(--geist-warning)]" />
          <span className="text-[var(--geist-accents-6)]">
            Executing {progress.current}/{progress.total}
          </span>
          {currentTicket && (
            <span className="text-[var(--geist-accents-5)]">({currentTicket})</span>
          )}
        </div>
      ) : (
        <button
          onClick={handleExecuteEpic}
          className="text-xs text-[var(--geist-success)] hover:text-[var(--geist-success-dark)] transition-colors px-2 py-1 rounded hover:bg-[var(--geist-success-lighter)] focus:outline-none focus:ring-1 focus:ring-[var(--geist-success)] flex items-center gap-1 border border-[var(--geist-success)]"
          title="Execute all tickets in epic"
        >
          <Play size={14} />
          Execute Epic ({epicTickets.length})
        </button>
      )}
      {(completedTasks.size > 0 || failedTasks.size > 0) && !executing && (
        <div className="flex items-center gap-2 text-xs">
          {completedTasks.size > 0 && (
            <span className="flex items-center gap-1 text-[var(--geist-success)]">
              <Check size={12} />
              {completedTasks.size}
            </span>
          )}
          {failedTasks.size > 0 && (
            <span className="flex items-center gap-1 text-[var(--geist-error)]">
              <X size={12} />
              {failedTasks.size}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
