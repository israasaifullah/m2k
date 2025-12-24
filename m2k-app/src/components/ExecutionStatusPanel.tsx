import { useEffect, useRef, useMemo } from "react";
import { Loader2, CheckCircle2, XCircle, X, StopCircle, Clock, Terminal, GitCommit } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../lib/store";
import { parseOutputLine, parseOutputLines } from "../lib/outputParser";

interface ClaudeCliOutput {
  line: string;
  stream: string;
}

export function ExecutionStatusPanel() {
  const executionState = useAppStore((s) => s.executionState);
  const addExecutionOutput = useAppStore((s) => s.addExecutionOutput);
  const setExecutionState = useAppStore((s) => s.setExecutionState);
  const epics = useAppStore((s) => s.epics);
  const outputRef = useRef<HTMLDivElement>(null);

  const epic = epics.find((e) => e.id === executionState.epicId);

  // Parse output for ticket completions and other signals
  const parsedSummary = useMemo(() => {
    return parseOutputLines(executionState.output);
  }, [executionState.output]);

  // Listen for Claude CLI output events and parse them
  useEffect(() => {
    const unlisten = listen<ClaudeCliOutput>("claude-cli-output", (event) => {
      const line = event.payload.line;
      addExecutionOutput(line);

      // Parse the line for ticket status changes
      const parsed = parseOutputLine(line);
      if (parsed) {
        if (parsed.type === "ticket_completed" && parsed.ticketId) {
          const currentCompleted = executionState.completedTickets;
          if (!currentCompleted.includes(parsed.ticketId)) {
            setExecutionState({
              completedTickets: [...currentCompleted, parsed.ticketId],
            });
          }
        } else if (parsed.type === "ticket_started" && parsed.ticketId) {
          setExecutionState({
            currentTicketId: parsed.ticketId,
          });
        }
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [addExecutionOutput, executionState.completedTickets, setExecutionState]);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [executionState.output]);

  const handleCancel = async () => {
    try {
      await invoke("stop_claude_cli");
      setExecutionState({ status: "idle", error: "Execution cancelled" });
    } catch (err) {
      console.error("Failed to stop:", err);
    }
  };

  const handleClose = () => {
    setExecutionState({ status: "idle" });
  };

  if (executionState.status === "idle") {
    return null;
  }

  const progress = executionState.totalTickets > 0
    ? Math.round((executionState.completedTickets.length / executionState.totalTickets) * 100)
    : 0;

  const elapsed = executionState.startedAt
    ? Math.floor((Date.now() - executionState.startedAt) / 1000)
    : 0;
  const elapsedMinutes = Math.floor(elapsed / 60);
  const elapsedSeconds = elapsed % 60;

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded-lg shadow-xl z-40 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--geist-accents-2)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {executionState.status === "running" && (
            <Loader2 size={16} className="text-[var(--geist-success)] animate-spin" aria-hidden="true" />
          )}
          {executionState.status === "error" && (
            <XCircle size={16} className="text-[var(--geist-error)]" aria-hidden="true" />
          )}
          {executionState.status === "completed" && (
            <CheckCircle2 size={16} className="text-[var(--geist-success)]" aria-hidden="true" />
          )}
          <span className="text-sm font-medium text-[var(--geist-foreground)]">
            {executionState.status === "running" && "Executing Epic"}
            {executionState.status === "completed" && "Completed"}
            {executionState.status === "error" && "Error"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {executionState.status === "running" && (
            <button
              onClick={handleCancel}
              className="px-2 py-1 text-xs text-[var(--geist-error)] hover:bg-[var(--geist-error-light)] rounded transition-colors flex items-center gap-1"
            >
              <StopCircle size={12} aria-hidden="true" />
              Cancel
            </button>
          )}
          {executionState.status !== "running" && (
            <button
              onClick={handleClose}
              className="p-1 text-[var(--geist-accents-5)] hover:text-[var(--geist-foreground)] transition-colors"
              aria-label="Close"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Epic info */}
        <div className="text-sm">
          <span className="text-[var(--geist-accents-5)]">Epic: </span>
          <span className="text-[var(--geist-foreground)]">
            {executionState.epicId} {epic && `- ${epic.title}`}
          </span>
        </div>

        {/* Current ticket */}
        {executionState.currentTicketId && (
          <div className="text-sm">
            <span className="text-[var(--geist-accents-5)]">Current: </span>
            <span className="text-[var(--geist-foreground)]">
              {executionState.currentTicketId}
            </span>
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-[var(--geist-accents-5)]">
            <span>
              {executionState.completedTickets.length} / {executionState.totalTickets} tickets
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-[var(--geist-accents-2)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--geist-success)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Elapsed time */}
        <div className="text-xs text-[var(--geist-accents-5)] flex items-center gap-1.5">
          <Clock size={12} aria-hidden="true" />
          Elapsed: {elapsedMinutes}m {elapsedSeconds}s
        </div>

        {/* Error message */}
        {executionState.error && (
          <div className="p-2 bg-[var(--geist-error-light)] border border-[var(--geist-error)] rounded text-xs text-[var(--geist-error)]">
            {executionState.error}
          </div>
        )}

        {/* Completion summary */}
        {executionState.status === "completed" && (
          <div className="p-3 bg-[var(--geist-success-light)] border border-[var(--geist-success)] rounded text-sm">
            <div className="font-medium text-[var(--geist-success-dark)] mb-2 flex items-center gap-2">
              <CheckCircle2 size={16} aria-hidden="true" />
              Epic Completed!
            </div>
            <div className="text-xs text-[var(--geist-success-dark)] space-y-1">
              <div>Tickets: {executionState.completedTickets.length}/{executionState.totalTickets}</div>
              {parsedSummary.commits.length > 0 && (
                <div className="flex items-center gap-1">
                  <GitCommit size={12} aria-hidden="true" />
                  Commits: {parsedSummary.commits.length}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock size={12} aria-hidden="true" />
                Duration: {elapsedMinutes}m {elapsedSeconds}s
              </div>
            </div>
          </div>
        )}

        {/* Output log (collapsible) */}
        {executionState.output.length > 0 && (
          <details className="group">
            <summary className="text-xs text-[var(--geist-accents-5)] cursor-pointer hover:text-[var(--geist-foreground)] flex items-center gap-1.5">
              <Terminal size={12} aria-hidden="true" />
              Output ({executionState.output.length} lines)
            </summary>
            <div
              ref={outputRef}
              className="mt-2 max-h-32 overflow-auto bg-[var(--geist-accents-1)] rounded p-2 font-mono text-xs text-[var(--geist-accents-6)]"
            >
              {executionState.output.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap break-all">
                  {line}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
