import React, { useEffect, useState, useRef } from "react";
import { useAppStore, type PrdDocType } from "../lib/store";
import { MarkdownEditor, type MarkdownEditorHandle } from "./MarkdownEditor";
import { EPIC_TEMPLATE, TICKET_TEMPLATE } from "../lib/templates";
import { validateEpic, validateTicket } from "../lib/validation";
import { Toast, useToast } from "./Toast";
import { invoke } from "@tauri-apps/api/core";
import { FileText, Image, FolderOpen, File, Save, Columns3 } from "lucide-react";
import { Select } from "./Select";
import { Toggle } from "./Toggle";

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

interface ResourcePickerModalProps {
  onClose: () => void;
  onSelect: (path: string, isImage: boolean, isMarkdown: boolean) => void;
}

function ResourcePickerModal({ onClose, onSelect }: ResourcePickerModalProps) {
  const projectPath = useAppStore((s) => s.projectPath);
  const [tree, setTree] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadResourceTree();
  }, [projectPath]);

  const loadResourceTree = async () => {
    if (!projectPath) return;

    setLoading(true);
    try {
      const resourcePath = `${projectPath}/resources`;
      const tree = await invoke<FileNode>("read_directory_tree", { path: resourcePath });
      setTree(tree);
    } catch (error) {
      console.error("Failed to load resources:", error);
      setTree(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSelect = (node: FileNode) => {
    if (node.isDirectory) return;

    const ext = node.name.split('.').pop()?.toLowerCase();
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '');
    const isMarkdown = ['md', 'markdown'].includes(ext || '');

    // Extract relative path
    const pathParts = node.path.split('/resources/');
    const relativePath = pathParts.length > 1 ? `resources/${pathParts[1]}` : node.path;

    onSelect(relativePath, isImage, isMarkdown);
  };

  const renderNode = (node: FileNode, level: number = 0): React.ReactElement[] => {
    if (!node.children) return [];

    return node.children.map(child => {
      const isExpanded = expandedDirs.has(child.path);
      const ext = child.name.split('.').pop()?.toLowerCase();
      const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '');
      const isMarkdown = ['md', 'markdown'].includes(ext || '');

      return (
        <div key={child.path}>
          <button
            onClick={() => child.isDirectory ? toggleDir(child.path) : handleSelect(child)}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-[var(--geist-accents-1)] flex items-center gap-2"
            style={{ paddingLeft: `${level * 12 + 12}px` }}
          >
            {child.isDirectory ? (
              <>
                <FolderOpen size={14} />
                <span>{child.name}</span>
              </>
            ) : isImage ? (
              <>
                <Image size={14} />
                <span>{child.name}</span>
              </>
            ) : isMarkdown ? (
              <>
                <FileText size={14} />
                <span>{child.name}</span>
              </>
            ) : (
              <>
                <FileText size={14} />
                <span>{child.name}</span>
              </>
            )}
          </button>
          {child.isDirectory && isExpanded && renderNode(child, level + 1)}
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded-lg w-96 max-h-96 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-3 border-b border-[var(--geist-accents-2)]">
          <h2 className="text-sm font-medium">Insert Resource</h2>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-[var(--geist-accents-5)]">Loading...</div>
          ) : tree ? (
            renderNode(tree)
          ) : (
            <div className="p-4 text-center text-sm text-[var(--geist-accents-5)]">No resources found</div>
          )}
        </div>
      </div>
    </div>
  );
}

function VimToggle() {
  const vimMode = useAppStore((s) => s.vimMode);
  const setVimMode = useAppStore((s) => s.setVimMode);

  return <Toggle checked={vimMode} onChange={setVimMode} label="VIM" showLabel={true} />;
}

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
        className={`px-3 py-1 text-xs rounded-full transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed ${
          value === "epic"
            ? "bg-[var(--geist-foreground)] text-[var(--geist-background)]"
            : "bg-gradient-to-r from-[var(--geist-accents-2)] to-[var(--geist-accents-1)] border border-[var(--geist-accents-3)] hover:bg-[var(--geist-accents-1)]"
        }`}
        role="radio"
        aria-checked={value === "epic"}
      >
        Epic
      </button>
      <button
        onClick={() => onChange("ticket")}
        disabled={disabled}
        className={`px-3 py-1 text-xs rounded-full transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed ${
          value === "ticket"
            ? "bg-[var(--geist-foreground)] text-[var(--geist-background)]"
            : "bg-gradient-to-r from-[var(--geist-accents-2)] to-[var(--geist-accents-1)] border border-[var(--geist-accents-3)] hover:bg-[var(--geist-accents-1)]"
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
  disabled?: boolean;
}

function EpicSelector({ value, onChange, disabled }: EpicSelectorProps) {
  const epics = useAppStore((s) => s.epics);

  return (
    <Select
      value={value}
      onChange={onChange}
      options={epics.map((epic) => ({
        value: epic.id,
        label: `${epic.id}: ${epic.title}`,
      }))}
      placeholder="Select Epic"
      variant="pill"
      showChevron={true}
      disabled={disabled}
      aria-label="Select epic"
    />
  );
}

export function PRDMode() {
  const prdState = useAppStore((s) => s.prdState);
  const setPrdState = useAppStore((s) => s.setPrdState);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const projectPath = useAppStore((s) => s.projectPath);
  const setTickets = useAppStore((s) => s.setTickets);
  const setEpics = useAppStore((s) => s.setEpics);
  const tickets = useAppStore((s) => s.tickets);
  const epics = useAppStore((s) => s.epics);
  const setSaveCallback = useAppStore((s) => s.setSaveCallback);
  const globalSelectedEpic = useAppStore((s) => s.selectedEpic);
  const [selectedEpic, setSelectedEpic] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();
  const [showResourcePicker, setShowResourcePicker] = useState(false);
  const editorRef = useRef<MarkdownEditorHandle>(null);

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

  const handleResourceSelect = (path: string, isImage: boolean, isMarkdown: boolean) => {
    let linkText = "";

    if (isImage) {
      const altText = path.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'image';
      linkText = `![${altText}](${path})`;
    } else if (isMarkdown) {
      const filename = path.split('/').pop()?.replace(/\.md$/, '') || 'file';
      linkText = `[[${filename}]]`;
    } else {
      linkText = path;
    }

    editorRef.current?.insertText(linkText);
    setShowResourcePicker(false);
    showToast("Resource link inserted", "success");
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

        // Optimistic update - update the ticket/epic in store immediately
        if (prdState.editingPath.includes("/backlog/") || prdState.editingPath.includes("/inprogress/") || prdState.editingPath.includes("/done/")) {
          // It's a ticket
          const titleMatch = prdState.content.match(/^# (T-\d+): (.+)$/m);
          const id = titleMatch?.[1];
          const title = titleMatch?.[2]?.trim();
          if (id && title) {
            const updatedTickets = tickets.map(t =>
              t.id === id ? { ...t, title } : t
            );
            setTickets(updatedTickets);
          }
        } else if (prdState.editingPath.includes("/epics/")) {
          // It's an epic
          const titleMatch = prdState.content.match(/^# (EPIC-\d+): (.+)$/m);
          const id = titleMatch?.[1];
          const title = titleMatch?.[2]?.trim();
          if (id && title) {
            const updatedEpics = epics.map(e =>
              e.id === id ? { ...e, title } : e
            );
            setEpics(updatedEpics);
          }
        }

        showToast("File saved successfully", "success");
      } else if (prdState.docType === "epic") {
        const nextId = await invoke<number>("get_next_epic_id", {
          projectPath: `${projectPath}`,
        });
        const paddedId = nextId.toString().padStart(3, "0");
        const titleMatch = prdState.content.match(/^# EPIC-[\d{}\w]+: (.+)$/m);
        const title = titleMatch?.[1]?.trim() || "Untitled";
        const safeName = title
          .replace(/[^a-zA-Z0-9\s-]/g, "")
          .replace(/\s+/g, "-");
        const filePath = `${projectPath}/epics/EPIC-${paddedId}-${safeName}.md`;
        const content = prdState.content.replace(
          /EPIC-\{ID\}/g,
          `EPIC-${paddedId}`
        );
        await invoke("save_markdown_file", { path: filePath, content });

        // Optimistic update - add epic to store immediately
        const scopeMatch = content.match(/## Scope\s+(.*?)(?=\n##|\n\n##|$)/s);
        const scope = scopeMatch?.[1]?.trim() || "";
        const newEpic = {
          id: `EPIC-${paddedId}`,
          title: title,
          scope: scope,
          tickets: [],
        };
        setEpics([...epics, newEpic]);

        showToast(`Epic EPIC-${paddedId} created`, "success");
      } else {
        if (!selectedEpic) {
          setError("Please select an epic for this ticket");
          setSaving(false);
          return;
        }
        const nextId = await invoke<number>("get_next_ticket_id", {
          projectPath: `${projectPath}`,
        });
        const paddedId = nextId.toString().padStart(3, "0");
        const filePath = `${projectPath}/backlog/T-${paddedId}.md`;
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

        // Optimistic update - add ticket to store immediately
        const titleMatch = content.match(/^# T-\d+: (.+)$/m);
        const title = titleMatch?.[1]?.trim() || "Untitled";
        const descMatch = content.match(/## Description\s+(.*?)(?=\n##|$)/s);
        const description = descMatch?.[1]?.trim() || "";
        const criteriaMatch = content.match(/## Acceptance Criteria\s+(.*?)(?=\n##|$)/s);
        const criteriaText = criteriaMatch?.[1]?.trim() || "";
        const criteria = criteriaText.split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim());
        const newTicket = {
          id: `T-${paddedId}`,
          title: title,
          epic: selectedEpic,
          description: description,
          criteria: criteria,
          status: "backlog" as const,
          filePath: filePath,
        };
        setTickets([...tickets, newTicket]);

        showToast(`Ticket T-${paddedId} created`, "success");
      }
      //setTimeout(() => setViewMode("kanban"), 1000);
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

    // Pre-select epic from global store when creating a new ticket
    if (prdState.mode === "create" && prdState.docType === "ticket" && globalSelectedEpic) {
      setSelectedEpic(globalSelectedEpic);
    }
  }, [prdState.mode, prdState.docType, globalSelectedEpic]);

  // Register save callback for vim :w trigger
  useEffect(() => {
    setSaveCallback(handleSave);
    return () => setSaveCallback(null);
  }, [handleSave, setSaveCallback]);

  const isEditing = prdState.mode === "edit";

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="flex items-center justify-center gap-3 py-3 border-b border-[var(--geist-accents-2)]">
        <DocTypeSelector
          value={prdState.docType}
          onChange={handleDocTypeChange}
          disabled={isEditing}
        />
        <EpicSelector
          value={selectedEpic}
          onChange={setSelectedEpic}
          disabled={prdState.docType === "epic" || isEditing}
        />
        <div className="px-3 py-1 rounded-full bg-gradient-to-r from-[var(--geist-accents-2)] to-[var(--geist-accents-1)] border border-[var(--geist-accents-3)] flex items-center gap-2">
          <span className="text-[10px] text-[var(--geist-accents-5)]">{isEditing ? "Editing" : "New"}</span>
          <span className="text-xs font-semibold text-[var(--geist-foreground)]">{prdState.docType}</span>
        </div>
        <VimToggle />
        {prdState.docType === "ticket" && selectedEpic && (
          <button
            onClick={() => {
              setViewMode("kanban");
            }}
            className="px-3 py-1 text-xs bg-gradient-to-r from-[var(--geist-accents-2)] to-[var(--geist-accents-1)] border border-[var(--geist-accents-3)] rounded-full hover:scale-[1.02] transition-all flex items-center gap-1.5"
            title={`View ${selectedEpic} Board`}
          >
            <Columns3 size={12} />
            <span>Epic Board</span>
          </button>
        )}
        <button
          onClick={() => setShowResourcePicker(true)}
          className="px-3 py-1 text-xs bg-gradient-to-r from-[var(--geist-accents-2)] to-[var(--geist-accents-1)] border border-[var(--geist-accents-3)] rounded-full hover:scale-[1.02] transition-all flex items-center gap-1.5"
          title="Insert resource"
        >
          <FolderOpen size={12} />
          <span>Insert Resource</span>
        </button>
        <div className="w-px h-4 bg-[var(--geist-accents-3)]" />
        {error && (
          <span className="text-xs text-[var(--geist-error)]">{error}</span>
        )}
        <button
          onClick={handleCancel}
          disabled={saving}
          className="px-3 py-1 text-sm border border-[var(--geist-accents-3)] rounded-full hover:bg-[var(--geist-accents-1)] transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1 text-sm bg-[var(--geist-success)] text-white rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
        >
          <Save size={14} />
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      {isEditing && prdState.editingPath && (
        <div className="px-4 py-2 border-b border-[var(--geist-accents-2)] bg-[var(--geist-accents-1)]">
          <div className="flex items-center gap-2 text-xs">
            <File size={12} className="text-[var(--geist-accents-5)] flex-shrink-0" />
            <span className="text-[var(--geist-accents-5)]">Editing:</span>
            <span className="text-[var(--geist-foreground)] font-mono truncate">{prdState.editingPath}</span>
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 p-4">
        <MarkdownEditor
          ref={editorRef}
          value={prdState.content}
          onChange={handleContentChange}
        />
      </div>
      {showResourcePicker && (
        <ResourcePickerModal
          onClose={() => setShowResourcePicker(false)}
          onSelect={handleResourceSelect}
        />
      )}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
}
