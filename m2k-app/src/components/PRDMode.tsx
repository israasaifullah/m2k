import React, { useEffect, useState, useRef } from "react";
import { useAppStore, type PrdDocType } from "../lib/store";
import { MarkdownEditor, type MarkdownEditorHandle } from "./MarkdownEditor";
import { EPIC_TEMPLATE, TICKET_TEMPLATE } from "../lib/templates";
import { validateEpic, validateTicket } from "../lib/validation";
import { Toast, useToast } from "./Toast";
import { invoke } from "@tauri-apps/api/core";
import { FileText, Image, FolderOpen } from "lucide-react";

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

  return (
    <button
      onClick={() => setVimMode(!vimMode)}
      className={`px-2 py-1 text-xs rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] ${
        vimMode
          ? "bg-[var(--geist-success)] text-white"
          : "border border-[var(--geist-accents-3)] text-[var(--geist-accents-5)] hover:bg-[var(--geist-accents-1)]"
      }`}
      aria-pressed={vimMode}
      aria-label="Toggle vim mode"
      title={vimMode ? "Vim mode enabled" : "Enable vim mode"}
    >
      VIM
    </button>
  );
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
        className={`px-3 py-1.5 text-sm rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] disabled:opacity-50 disabled:cursor-not-allowed ${
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
        className={`px-3 py-1.5 text-sm rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] disabled:opacity-50 disabled:cursor-not-allowed ${
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
      className="px-3 py-1 text-sm bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)]"
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
          <VimToggle />
          <button
            onClick={() => setShowResourcePicker(true)}
            className="px-2 py-1 text-xs border border-[var(--geist-accents-3)] rounded-full hover:bg-[var(--geist-accents-1)] transition-colors flex items-center gap-1"
            title="Insert resource"
          >
            <FolderOpen size={14} />
            Insert Resource
          </button>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-sm text-[var(--geist-error)]">{error}</span>
          )}
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-3 py-1.5 text-sm border border-[var(--geist-accents-3)] rounded-full hover:bg-[var(--geist-accents-1)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-sm bg-[var(--geist-success)] text-white rounded-full hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--geist-success)] focus:ring-offset-1 focus:ring-offset-[var(--geist-background)] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
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
