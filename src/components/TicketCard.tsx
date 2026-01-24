import { useState, useEffect } from "react";
import { Pencil, Copy, Check, X, Play, Square, Loader2 } from "lucide-react";
import type { Ticket } from "../types";
import { useAppStore } from "../lib/store";
import { invoke } from "@tauri-apps/api/core";
import { confirm } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";

interface Props {
  ticket: Ticket;
}


export function TicketCard({ ticket }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [execStatus, setExecStatus] = useState<"idle" | "queued" | "running" | "completed" | "failed">("idle");
  const [output, setOutput] = useState<string[]>([]);
  const [showOutput, setShowOutput] = useState(false);
  const setPrdState = useAppStore((s) => s.setPrdState);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const isInProgress = ticket.status === "in_progress";
  const projectPath = useAppStore((s) => s.projectPath);

  useEffect(() => {
    const unlistenOutput = listen<{ task_id: string; output: string }>("task-output", (event) => {
      if (event.payload.task_id === taskId) {
        setOutput((prev) => [...prev, event.payload.output]);
        setExecStatus("running");
      }
    });

    const unlistenCompleted = listen<{ task_id: string }>("task-completed", (event) => {
      if (event.payload.task_id === taskId) {
        setExecStatus("completed");
      }
    });

    const unlistenFailed = listen<{ task_id: string; error: string }>("task-failed", (event) => {
      if (event.payload.task_id === taskId) {
        setExecStatus("failed");
        setOutput((prev) => [...prev, `Error: ${event.payload.error}`]);
      }
    });

    return () => {
      unlistenOutput.then((fn) => fn());
      unlistenCompleted.then((fn) => fn());
      unlistenFailed.then((fn) => fn());
    };
  }, [taskId]);

  const handleExecute = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setExecStatus("queued");
      setOutput([]);
      setShowOutput(true);
      const id = await invoke<string>("submit_claude_task", {
        prompt: ticket.description || ticket.title,
        workspacePath: projectPath || null,
        timeoutSecs: 300,
        priority: 5,
      });
      setTaskId(id);
    } catch (err) {
      console.error("Failed to execute:", err);
      setExecStatus("failed");
      setOutput([`Failed to submit task: ${err}`]);
    }
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!taskId) return;
    try {
      await invoke("cancel_claude_task", { taskId });
      setExecStatus("idle");
      setOutput((prev) => [...prev, "Task cancelled"]);
    } catch (err) {
      console.error("Failed to cancel:", err);
    }
  };

  const toggle = () => setExpanded(!expanded);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  const handleCopyPath = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(ticket.filePath);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy path:", err);
    }
  };

  const handleEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const content = await invoke<string>("read_markdown_file", {
        path: ticket.filePath,
      });
      setPrdState({
        mode: "edit",
        docType: "ticket",
        content,
        editingPath: ticket.filePath,
      });
      setViewMode("prd");
    } catch (err) {
      console.error("Failed to read ticket:", err);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm(
      `Are you sure you want to delete ticket ${ticket.id}?`,
      { title: "Delete Ticket", kind: "warning" }
    );
    if (confirmed) {
      try {
        await invoke("delete_markdown_file", { path: ticket.filePath });
      } catch (err) {
        console.error("Failed to delete ticket:", err);
      }
    }
  };

  const baseClass = "rounded p-2 cursor-pointer transition-all duration-200 ease-out animate-fade-in hover:bg-[var(--geist-accents-1)] focus:outline-none focus:ring-1 focus:ring-[var(--geist-accents-3)]";
  const cardClass = isInProgress
    ? `${baseClass} bg-[var(--geist-accents-1)] border-l-2 border-[var(--geist-success)]`
    : `${baseClass} bg-transparent`;

  return (
    <article
      className={`group ${cardClass}`}
      onClick={toggle}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-expanded={expanded}
      aria-label={`${ticket.id}: ${ticket.title}${isInProgress ? ", currently in progress" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--geist-accents-4)] font-mono">{ticket.id}</span>
        <h3 className="flex-1 text-sm truncate">{ticket.title}</h3>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {execStatus === "idle" && (
            <button
              onClick={handleExecute}
              className="p-1 text-[var(--geist-accents-4)] hover:text-[var(--monokai-green)] transition-colors"
              aria-label={`Execute ${ticket.id}`}
              title="Execute"
            >
              <Play size={14} />
            </button>
          )}
          {(execStatus === "queued" || execStatus === "running") && (
            <button
              onClick={handleCancel}
              className="p-1 text-[var(--monokai-orange)] hover:text-[var(--monokai-yellow)] transition-colors"
              aria-label={`Cancel ${ticket.id}`}
              title="Cancel"
            >
              {execStatus === "queued" ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
            </button>
          )}
          {execStatus === "completed" && (
            <span className="p-1 text-[var(--monokai-green)]" title="Completed">
              <Check size={14} />
            </span>
          )}
          {execStatus === "failed" && (
            <span className="p-1 text-[var(--monokai-red)]" title="Failed">
              <X size={14} />
            </span>
          )}
          <button
            onClick={handleCopyPath}
            className="p-1 text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors"
            aria-label={`Copy path for ${ticket.id}`}
            title="Copy path"
          >
            {copied ? <Check size={14} className="text-[var(--monokai-green)]" /> : <Copy size={14} />}
          </button>
          <button
            onClick={handleEdit}
            className="p-1 text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors"
            aria-label={`Edit ${ticket.id}`}
            title="Edit"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors"
            aria-label={`Delete ${ticket.id}`}
            title="Delete"
          >
            <X size={15} />
          </button>
        </div>
      </div>
      {expanded && ticket.description && (
        <p className="text-xs text-[var(--geist-accents-4)] mt-1 pl-10">
          {ticket.description}
        </p>
      )}
      {showOutput && output.length > 0 && (
        <div className="mt-3 border border-[var(--geist-accents-2)] rounded p-2 bg-[var(--geist-accents-1)] max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--geist-accents-5)] font-medium">Execution Output</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowOutput(false);
              }}
              className="text-xs text-[var(--geist-accents-5)] hover:text-[var(--geist-foreground)]"
            >
              <X size={12} />
            </button>
          </div>
          <pre className="text-xs font-mono whitespace-pre-wrap text-[var(--geist-foreground)]">
            {output.join("\n")}
          </pre>
        </div>
      )}
    </article>
  );
}
