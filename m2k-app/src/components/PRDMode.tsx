import { useAppStore, type PrdDocType } from "../lib/store";
import { MarkdownEditor } from "./MarkdownEditor";
import { EPIC_TEMPLATE, TICKET_TEMPLATE } from "../lib/templates";
import { validateEpic, validateTicket } from "../lib/validation";
import { Toast, useToast } from "./Toast";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface DocTypeSelectorProps {
  value: PrdDocType;
  onChange: (type: PrdDocType) => void;
  disabled?: boolean;
}

function DocTypeSelector({ value, onChange, disabled }: DocTypeSelectorProps) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Document type">
      <button
        onClick={() => onChange("epic")}
        disabled={disabled}
        className={`px-3 py-1.5 text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] disabled:opacity-50 disabled:cursor-not-allowed ${
          value === "epic"
            ? "bg-[var(--geist-foreground)] text-[var(--geist-background)]"
            : "border border-[var(--geist-accents-3)] hover:bg-[var(--geist-accents-1)]"
        }`}
        role="radio"
        aria-checked={value === "epic"}
      >
        Epic
      </button>
      <button
        onClick={() => onChange("ticket")}
        disabled={disabled}
        className={`px-3 py-1.5 text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] disabled:opacity-50 disabled:cursor-not-allowed ${
          value === "ticket"
            ? "bg-[var(--geist-foreground)] text-[var(--geist-background)]"
            : "border border-[var(--geist-accents-3)] hover:bg-[var(--geist-accents-1)]"
        }`}
        role="radio"
        aria-checked={value === "ticket"}
      >
        Ticket
      </button>
    </div>
  );
}

interface EpicSelectorProps {
  value: string;
  onChange: (epicId: string) => void;
}

function EpicSelector({ value, onChange }: EpicSelectorProps) {
  const epics = useAppStore((s) => s.epics);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1 text-sm bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)]"
      aria-label="Select epic"
    >
      <option value="">Select Epic</option>
      {epics.map((epic) => (
        <option key={epic.id} value={epic.id}>
          {epic.id}: {epic.title}
        </option>
      ))}
    </select>
  );
}

export function PRDMode() {
  const prdState = useAppStore((s) => s.prdState);
  const setPrdState = useAppStore((s) => s.setPrdState);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const projectPath = useAppStore((s) => s.projectPath);
  const [selectedEpic, setSelectedEpic] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const handleDocTypeChange = (docType: PrdDocType) => {
    const content = docType === "epic" ? EPIC_TEMPLATE : TICKET_TEMPLATE;
    setPrdState({ docType, content });
    setSelectedEpic("");
    setError(null);
  };

  const handleContentChange = (content: string) => {
    setPrdState({ content });
    setError(null);
  };

  const handleCancel = () => {
    setViewMode("kanban");
  };

  const handleSave = async () => {
    if (!projectPath) return;

    // Validate content
    const validation =
      prdState.docType === "epic"
        ? validateEpic(prdState.content)
        : validateTicket(prdState.content);

    if (!validation.valid && prdState.mode === "edit") {
      setError(validation.errors[0]);
      showToast(validation.errors[0], "error");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (prdState.mode === "edit" && prdState.editingPath) {
        await invoke("save_markdown_file", {
          path: prdState.editingPath,
          content: prdState.content,
        });
        showToast("File saved successfully", "success");
      } else if (prdState.docType === "epic") {
        const nextId = await invoke<number>("get_next_epic_id", {
          projectPath,
        });
        const paddedId = nextId.toString().padStart(3, "0");
        const titleMatch = prdState.content.match(/^# EPIC-[\d{}\w]+: (.+)$/m);
        const title = titleMatch?.[1]?.trim() || "Untitled";
        const safeName = title
          .replace(/[^a-zA-Z0-9\s-]/g, "")
          .replace(/\s+/g, "-");
        const filePath = `${projectPath}/project-management/epics/EPIC-${paddedId}-${safeName}.md`;
        const content = prdState.content.replace(
          /EPIC-\{ID\}/g,
          `EPIC-${paddedId}`
        );
        await invoke("save_markdown_file", { path: filePath, content });
        showToast(`Epic EPIC-${paddedId} created`, "success");
      } else {
        if (!selectedEpic) {
          setError("Please select an epic for this ticket");
          setSaving(false);
          return;
        }
        const nextId = await invoke<number>("get_next_ticket_id", {
          projectPath,
        });
        const paddedId = nextId.toString().padStart(3, "0");
        const filePath = `${projectPath}/project-management/backlog/T-${paddedId}.md`;
        let content = prdState.content
          .replace(/T-\{ID\}/g, `T-${paddedId}`)
          .replace(/EPIC-\{EPIC_ID\}/g, selectedEpic)
          .replace(/\*\*Epic:\*\* EPIC-\d+/, `**Epic:** ${selectedEpic}`);
        if (content.includes("**Epic:** EPIC-{EPIC_ID}")) {
          content = content.replace(
            "**Epic:** EPIC-{EPIC_ID}",
            `**Epic:** ${selectedEpic}`
          );
        }
        await invoke("save_markdown_file", { path: filePath, content });
        showToast(`Ticket T-${paddedId} created`, "success");
      }
      setTimeout(() => setViewMode("kanban"), 1000);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!prdState.content && prdState.mode === "create") {
      const content =
        prdState.docType === "epic" ? EPIC_TEMPLATE : TICKET_TEMPLATE;
      setPrdState({ content });
    }
  }, []);

  const isEditing = prdState.mode === "edit";

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="px-4 py-3 border-b border-[var(--geist-accents-2)] flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <DocTypeSelector
            value={prdState.docType}
            onChange={handleDocTypeChange}
            disabled={isEditing}
          />
          {prdState.docType === "ticket" && prdState.mode === "create" && (
            <EpicSelector value={selectedEpic} onChange={setSelectedEpic} />
          )}
          <span className="text-sm text-[var(--geist-accents-5)]">
            {isEditing ? "Editing" : "New"} {prdState.docType}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-sm text-[var(--geist-error)]">{error}</span>
          )}
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-3 py-1.5 text-sm border border-[var(--geist-accents-3)] rounded-md hover:bg-[var(--geist-accents-1)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-sm bg-[var(--geist-success)] text-white rounded-md hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 p-4">
        <MarkdownEditor
          value={prdState.content}
          onChange={handleContentChange}
        />
      </div>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
}
