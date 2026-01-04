import { useState, useEffect } from "react";
import { Pencil, ChevronDown, ChevronRight, Copy, Check, X, Play, Square, Loader2 } from "lucide-react";
import type { Ticket } from "../types";
import { useAppStore } from "../lib/store";
import { invoke } from "@tauri-apps/api/core";
import { confirm } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";

interface Props {
  ticket: Ticket;
}

const epicColors: Record<string, string> = {
  "EPIC-001": "bg-blue-600",
  "EPIC-002": "bg-emerald-600",
  "EPIC-003": "bg-violet-600",
  "EPIC-004": "bg-orange-600",
  "EPIC-005": "bg-pink-600",
  "EPIC-006": "bg-cyan-600",
  "EPIC-007": "bg-rose-600",
  "EPIC-008": "bg-amber-600",
  "EPIC-009": "bg-teal-600",
};

function PulsingDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--geist-success)] opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--geist-success)]"></span>
    </span>
  );
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
  const epicColor = epicColors[ticket.epic] || "bg-[var(--geist-accents-4)]";
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
      const relativePath = projectPath
        ? ticket.filePath.replace(projectPath, '.')
        : ticket.filePath;
      await navigator.clipboard.writeText(relativePath);
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

  const baseClass = "rounded-lg p-4 min-h-[90px] cursor-pointer transition-all duration-200 ease-out animate-fade-in hover:scale-[1.01] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)]";
  const cardClass = isInProgress
    ? `${baseClass} bg-[var(--geist-accents-1)] hover:bg-[var(--geist-accents-2)] border border-[var(--geist-success)] animate-pulse-subtle`
    : `${baseClass} bg-[var(--geist-background)] hover:bg-[var(--geist-accents-1)] border border-[var(--geist-accents-2)]`;

  return (
    <article
      className={cardClass}
      onClick={toggle}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-expanded={expanded}
      aria-label={`${ticket.id}: ${ticket.title}${isInProgress ? ", currently in progress" : ""}`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {isInProgress && (
          <>
            <PulsingDot />
            <span className="sr-only">In progress</span>
          </>
        )}
        <span className={`${epicColor} text-white text-xs px-1.5 py-0.5 rounded font-medium`} aria-label={`Epic ${ticket.epic}`}>
          {ticket.epic}
        </span>
        <span className="text-xs text-[var(--geist-accents-5)] font-mono">
          {ticket.id}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {execStatus === "idle" && (
            <button
              onClick={handleExecute}
              className="text-xs text-[var(--geist-success)] hover:text-[var(--geist-success-dark)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--geist-success-lighter)] focus:outline-none focus:ring-1 focus:ring-[var(--geist-success)] flex items-center gap-1"
              aria-label={`Execute ${ticket.id}`}
              title="Execute ticket with Claude"
            >
              <Play size={12} aria-hidden="true" />
              Execute
            </button>
          )}
          {(execStatus === "queued" || execStatus === "running") && (
            <button
              onClick={handleCancel}
              className="text-xs text-[var(--geist-warning)] hover:text-[var(--geist-warning-dark)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--geist-warning-lighter)] focus:outline-none focus:ring-1 focus:ring-[var(--geist-warning)] flex items-center gap-1"
              aria-label={`Cancel ${ticket.id}`}
              title="Cancel execution"
            >
              {execStatus === "queued" ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Square size={12} aria-hidden="true" />}
              {execStatus === "queued" ? "Queued" : "Cancel"}
            </button>
          )}
          {execStatus === "completed" && (
            <span className="text-xs text-[var(--geist-success)] px-1.5 py-0.5 flex items-center gap-1">
              <Check size={12} aria-hidden="true" />
              Done
            </span>
          )}
          {execStatus === "failed" && (
            <span className="text-xs text-[var(--geist-error)] px-1.5 py-0.5 flex items-center gap-1">
              <X size={12} aria-hidden="true" />
              Failed
            </span>
          )}
          <button
            onClick={handleCopyPath}
            className="text-xs text-[var(--geist-accents-5)] hover:text-[var(--geist-foreground)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--geist-accents-2)] focus:outline-none focus:ring-1 focus:ring-[var(--geist-success)] flex items-center gap-1"
            aria-label={`Copy path for ${ticket.id}`}
            title="Copy file path"
          >
            {copied ? <Check size={12} className="text-[var(--geist-success)]" /> : <Copy size={12} />}
          </button>
          <button
            onClick={handleEdit}
            className="text-xs text-[var(--geist-accents-5)] hover:text-[var(--geist-foreground)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--geist-accents-2)] focus:outline-none focus:ring-1 focus:ring-[var(--geist-success)] flex items-center gap-1"
            aria-label={`Edit ${ticket.id}`}
          >
            <Pencil size={12} aria-hidden="true" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="text-xs text-[var(--geist-error)] hover:text-[var(--geist-error-dark)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--geist-error-lighter)] focus:outline-none focus:ring-1 focus:ring-[var(--geist-error)] flex items-center gap-1"
            aria-label={`Delete ${ticket.id}`}
            title="Delete ticket"
          >
            <X size={12} aria-hidden="true" />
          </button>
        </div>
        {isInProgress && (
          <span className="text-xs text-[var(--geist-success)] font-medium animate-pulse" aria-hidden="true">
            Working...
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        {expanded ? (
          <ChevronDown size={14} className="text-[var(--geist-accents-5)]" aria-hidden="true" />
        ) : (
          <ChevronRight size={14} className="text-[var(--geist-accents-5)]" aria-hidden="true" />
        )}
        <h3 className="font-medium text-sm">{ticket.title}</h3>
      </div>
      {expanded && ticket.description && (
        <p className="text-xs text-[var(--geist-accents-5)] mt-2 animate-slide-up">
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
