import { useAppStore, type PrdDocType } from "../lib/store";
import { MarkdownEditor } from "./MarkdownEditor";
import { EPIC_TEMPLATE, TICKET_TEMPLATE } from "../lib/templates";
import { useEffect } from "react";

interface DocTypeSelectorProps {
  value: PrdDocType;
  onChange: (type: PrdDocType) => void;
}

function DocTypeSelector({ value, onChange }: DocTypeSelectorProps) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Document type">
      <button
        onClick={() => onChange("epic")}
        className={`px-3 py-1.5 text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] ${
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
        className={`px-3 py-1.5 text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] ${
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

export function PRDMode() {
  const prdState = useAppStore((s) => s.prdState);
  const setPrdState = useAppStore((s) => s.setPrdState);
  const setViewMode = useAppStore((s) => s.setViewMode);

  const handleDocTypeChange = (docType: PrdDocType) => {
    const content = docType === "epic" ? EPIC_TEMPLATE : TICKET_TEMPLATE;
    setPrdState({ docType, content });
  };

  const handleContentChange = (content: string) => {
    setPrdState({ content });
  };

  const handleCancel = () => {
    setViewMode("kanban");
  };

  useEffect(() => {
    if (!prdState.content) {
      const content = prdState.docType === "epic" ? EPIC_TEMPLATE : TICKET_TEMPLATE;
      setPrdState({ content });
    }
  }, []);

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="px-4 py-3 border-b border-[var(--geist-accents-2)] flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <DocTypeSelector
            value={prdState.docType}
            onChange={handleDocTypeChange}
          />
          <span className="text-sm text-[var(--geist-accents-5)]">
            {prdState.mode === "edit" ? "Editing" : "New"} {prdState.docType}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-sm border border-[var(--geist-accents-3)] rounded-md hover:bg-[var(--geist-accents-1)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)]"
          >
            Cancel
          </button>
          <button
            className="px-3 py-1.5 text-sm bg-[var(--geist-success)] text-white rounded-md hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)]"
          >
            Save
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 p-4">
        <MarkdownEditor
          value={prdState.content}
          onChange={handleContentChange}
        />
      </div>
    </div>
  );
}
