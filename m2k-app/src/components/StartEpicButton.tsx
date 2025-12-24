import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../lib/store";
import { buildEpicPrompt } from "../lib/promptBuilder";

interface ConfirmationDialogProps {
  epicId: string;
  epicTitle: string;
  ticketCount: number;
  cliInstalled: boolean | null;
  cliVersion: string | null;
  error: string | null;
  starting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmationDialog({
  epicId,
  epicTitle,
  ticketCount,
  cliInstalled,
  cliVersion,
  error,
  starting,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !starting) onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, starting]);

  const canStart = cliInstalled === true && !starting;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in"
      onClick={starting ? undefined : onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        className="bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="dialog-title"
          className="text-lg font-semibold text-[var(--geist-foreground)] mb-4"
        >
          Start Epic?
        </h2>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--geist-accents-5)]">Epic:</span>
            <span className="text-sm font-medium text-[var(--geist-foreground)]">
              {epicId}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--geist-accents-5)]">Title:</span>
            <span className="text-sm text-[var(--geist-foreground)]">
              {epicTitle}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--geist-accents-5)]">Tickets:</span>
            <span className="text-sm text-[var(--geist-foreground)]">
              {ticketCount} ticket{ticketCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--geist-accents-5)]">Claude CLI:</span>
            {cliInstalled === null ? (
              <span className="text-sm text-[var(--geist-accents-4)]">Checking...</span>
            ) : cliInstalled ? (
              <span className="text-sm text-[var(--geist-success)]">
                Installed {cliVersion && `(${cliVersion})`}
              </span>
            ) : (
              <span className="text-sm text-[var(--geist-error)]">Not installed</span>
            )}
          </div>
        </div>

        {!cliInstalled && cliInstalled !== null && (
          <div className="p-3 mb-4 bg-[var(--geist-error-light)] border border-[var(--geist-error)] rounded-lg text-sm text-[var(--geist-error)]">
            Claude Code CLI is not installed. Install it with: npm install -g @anthropic-ai/claude-code
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 bg-[var(--geist-error-light)] border border-[var(--geist-error)] rounded-lg text-sm text-[var(--geist-error)]">
            {error}
          </div>
        )}

        <p className="text-sm text-[var(--geist-accents-5)] mb-6">
          This will start Claude Code to work on all tickets in this epic sequentially.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={starting}
            className="px-4 py-2 text-sm border border-[var(--geist-accents-3)] rounded-full hover:bg-[var(--geist-accents-1)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canStart}
            className="px-4 py-2 text-sm bg-[var(--geist-success)] text-white rounded-full hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] disabled:opacity-50"
          >
            {starting ? "Starting..." : "Start Epic"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StartEpicButton() {
  const selectedEpic = useAppStore((s) => s.selectedEpic);
  const epics = useAppStore((s) => s.epics);
  const tickets = useAppStore((s) => s.tickets);
  const projectPath = useAppStore((s) => s.projectPath);
  const setExecutionState = useAppStore((s) => s.setExecutionState);
  const executionState = useAppStore((s) => s.executionState);
  const [showDialog, setShowDialog] = useState(false);
  const [cliInstalled, setCliInstalled] = useState<boolean | null>(null);
  const [cliVersion, setCliVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const epic = epics.find((e) => e.id === selectedEpic);
  const epicTickets = tickets.filter((t) => t.epic === selectedEpic);
  const hasInProgressTickets = epicTickets.some((t) => t.status === "in_progress");
  const isExecutionRunning = executionState.status === "running";

  // Check CLI installation when dialog opens
  useEffect(() => {
    if (showDialog) {
      setCliInstalled(null);
      setCliVersion(null);
      setError(null);

      const checkCli = async () => {
        try {
          const installed = await invoke<boolean>("check_claude_cli");
          setCliInstalled(installed);
          if (installed) {
            const version = await invoke<string | null>("get_claude_cli_version");
            setCliVersion(version);
          }
        } catch (err) {
          setCliInstalled(false);
          setError(err instanceof Error ? err.message : String(err));
        }
      };
      checkCli();
    }
  }, [showDialog]);

  const handleStartClick = useCallback(() => {
    setShowDialog(true);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!projectPath || !selectedEpic || !epic) return;

    setStarting(true);
    setError(null);

    const backlogTickets = epicTickets.filter((t) => t.status === "backlog");

    // Set execution state
    setExecutionState({
      status: "running",
      epicId: selectedEpic,
      currentTicketId: backlogTickets[0]?.id || null,
      completedTickets: [],
      totalTickets: backlogTickets.length,
      output: [],
      error: null,
      startedAt: Date.now(),
    });

    try {
      // Build comprehensive prompt for the epic
      const prompt = buildEpicPrompt({
        epic,
        tickets: epicTickets,
        projectPath,
      });

      setShowDialog(false);

      const result = await invoke<{ success: boolean; error?: string }>("start_claude_cli", {
        prompt,
        workingDir: projectPath,
      });

      if (result.success) {
        setExecutionState({ status: "completed" });
      } else {
        setExecutionState({ status: "error", error: result.error || "Execution failed" });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      setExecutionState({ status: "error", error: errMsg });
    } finally {
      setStarting(false);
    }
  }, [projectPath, selectedEpic, epic, epicTickets, setExecutionState]);

  const handleCancel = useCallback(() => {
    if (!starting) {
      setShowDialog(false);
    }
  }, [starting]);

  if (!selectedEpic || !epic) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleStartClick}
        disabled={hasInProgressTickets || isExecutionRunning}
        className="px-3 py-1 text-xs md:text-sm bg-[var(--geist-success)] text-white rounded-full hover:opacity-90 transition-opacity whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={`Start epic ${selectedEpic}`}
        title={isExecutionRunning ? "Execution in progress" : hasInProgressTickets ? "Epic has tickets in progress" : `Start ${selectedEpic}`}
      >
        Start
      </button>

      {showDialog && (
        <ConfirmationDialog
          epicId={epic.id}
          epicTitle={epic.title}
          ticketCount={epicTickets.length}
          cliInstalled={cliInstalled}
          cliVersion={cliVersion}
          error={error}
          starting={starting}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
