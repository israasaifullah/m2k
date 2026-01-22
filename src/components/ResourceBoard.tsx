import { useState, useEffect, useMemo, useCallback } from "react";
import { ChevronRight, ChevronDown, Folder, X, Plus, Edit2, Trash2, Save, Upload, Copy } from "lucide-react";
import { useAppStore } from "../lib/store";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { MarkdownEditor } from "./MarkdownEditor";
import { Toast, useToast } from "./Toast";
import { ResizeHandle } from "./ResizeHandle";
import { SwaggerPreview } from "./SwaggerPreview";
import { ExcalidrawPreview } from "./ExcalidrawPreview";
import { isOpenAPIExtension, parseOpenAPIContent, type OpenAPISpec } from "../lib/openapi";

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

interface TreeItemProps {
  node: FileNode;
  level: number;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
  onSelect: (path: string, isDirectory: boolean) => void;
  onContextMenu: (node: FileNode, event: React.MouseEvent) => void;
}


function TreeItem({ node, level, selectedPath, expandedPaths, onToggleExpand, onSelect, onContextMenu }: TreeItemProps) {
  const expanded = expandedPaths.has(node.path);

  const handleToggle = () => {
    if (node.isDirectory) {
      onToggleExpand(node.path);
    }
    onSelect(node.path, node.isDirectory);
  };

  const isSelected = selectedPath === node.path;

  return (
    <div>
      <button
        onClick={handleToggle}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(node, e);
        }}
        className={`w-full pr-3 py-0.5 text-xs flex items-center gap-1.5 hover:bg-[var(--geist-accents-2)] transition-colors ${
          isSelected ? "bg-[var(--geist-accents-2)] text-[var(--geist-foreground)]" : "text-[var(--geist-accents-4)]"
        }`}
        style={{ paddingLeft: `${level * 10 + 6}px` }}
      >
        {node.isDirectory ? (
          <>
            {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            <span className="flex-1 text-left truncate">{node.name}</span>
          </>
        ) : (
          <>
            <span className="w-2.5" />
            <span className="flex-1 text-left truncate">{node.name}</span>
          </>
        )}
      </button>
      {expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              level={level + 1}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FilePreviewProps {
  path: string;
}

function FilePreview({ path }: FilePreviewProps) {
  const setSaveCallback = useAppStore((s) => s.setSaveCallback);
  const [content, setContent] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [openAPISpec, setOpenAPISpec] = useState<OpenAPISpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    loadFile();
    setHasChanges(false);
  }, [path]);

  const isExcalidrawFile = path.endsWith('.excalidraw');

  const loadFile = async () => {
    setLoading(true);
    setError(null);
    setOpenAPISpec(null);
    const ext = path.split('.').pop()?.toLowerCase();
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '');
    const isInApiContracts = path.includes('/api-contracts/');

    if (isImage) {
      try {
        const base64Data = await invoke<string>("read_image_as_base64", { path });
        setImageData(base64Data);
      } catch (err) {
        setError(String(err));
        setImageData(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const fileContent = await invoke<string>("read_markdown_file", { path });

      if (isInApiContracts && isOpenAPIExtension(path)) {
        const spec = parseOpenAPIContent(fileContent, path);
        if (spec) {
          setOpenAPISpec(spec);
          setContent(fileContent);
          setLoading(false);
          return;
        }
      }

      setContent(fileContent);
      setEditContent(fileContent);
      if (!isExcalidrawFile) {
        setEditing(true);
      }
    } catch (err) {
      setError(String(err));
      setContent(null);
      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await invoke("save_markdown_file", { path, content: editContent });
      setContent(editContent);
      setHasChanges(false);
      setEditing(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleEditorChange = (value: string) => {
    setEditContent(value);
    setHasChanges(value !== content);
  };

  // Register save callback for vim :w trigger
  useEffect(() => {
    setSaveCallback(handleSave);
    return () => setSaveCallback(null);
  }, [handleSave, setSaveCallback]);

  const ext = path.split('.').pop()?.toLowerCase();
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '');

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--geist-accents-5)]">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--geist-error)] mb-2">Failed to load file</p>
          <p className="text-xs text-[var(--geist-accents-4)]">{error}</p>
        </div>
      </div>
    );
  }

  if (isImage && imageData) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <img
          src={imageData}
          alt={path.split('/').pop()}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    );
  }

  if (openAPISpec) {
    return <SwaggerPreview spec={openAPISpec} fileName={path.split('/').pop() || 'API Spec'} />;
  }

  if (isExcalidrawFile && content !== null) {
    const handleExcalidrawSave = async (data: string) => {
      await invoke("save_markdown_file", { path, content: data });
    };
    return (
      <ExcalidrawPreview
        initialContent={content}
        fileName={path.split('/').pop() || 'Drawing'}
        onSave={handleExcalidrawSave}
      />
    );
  }

  if (content !== null) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-2 pt-1 pb-[2.5px] border-b border-[var(--geist-accents-2)] bg-[var(--geist-accents-1)]">
          <span className="text-xs text-[var(--geist-accents-4)] truncate">{path.split('/').pop()}</span>
          <div className="flex items-center">
            {editing ? (
              <>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditContent(content);
                    setHasChanges(false);
                  }}
                  className="p-1.5 text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors"
                  title="Cancel"
                >
                  <X size={15} />
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className="p-1.5 text-[var(--geist-accents-4)] hover:text-[var(--monokai-green)] transition-colors disabled:opacity-50"
                  title={saving ? "Saving..." : "Save"}
                >
                  <Save size={15} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors"
                title="Edit"
              >
                <Edit2 size={15} />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 min-h-0">
          {editing ? (
            <div className="h-full">
              <MarkdownEditor value={editContent} onChange={handleEditorChange} filePath={path} />
            </div>
          ) : (
            <div className="h-full overflow-auto p-6">
              <pre className="text-sm whitespace-pre-wrap font-mono">{content}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-[var(--geist-accents-5)]">Unable to preview file</p>
    </div>
  );
}

function filterTree(node: FileNode, searchQuery: string, fileType: string): FileNode | null {
  const matchesSearch = searchQuery === "" || node.name.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesType = fileType === "all" ||
    (fileType === "markdown" && node.name.endsWith('.md')) ||
    (fileType === "image" && /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(node.name)) ||
    (fileType === "code" && /\.(js|ts|jsx|tsx|py|rs|go|java|c|cpp)$/i.test(node.name));

  if (node.isDirectory) {
    const filteredChildren = node.children
      ?.map(child => filterTree(child, searchQuery, fileType))
      .filter((child): child is FileNode => child !== null) || [];

    if (filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren
      };
    }
    return matchesSearch ? { ...node, children: [] } : null;
  }

  return matchesSearch && matchesType ? node : null;
}

interface ContextMenuProps {
  node: FileNode;
  x: number;
  y: number;
  onClose: () => void;
  onRename: (node: FileNode) => void;
  onDelete: (node: FileNode) => void;
  onCopyPath: (node: FileNode) => void;
  onUploadToFolder?: (node: FileNode) => void;
  onNewFileInFolder?: (node: FileNode) => void;
  onCopyToProject?: (node: FileNode) => void;
}

function ContextMenu({ node, x, y, onClose, onRename, onDelete, onCopyPath, onUploadToFolder, onNewFileInFolder, onCopyToProject }: ContextMenuProps) {
  useEffect(() => {
    const handleClick = () => onClose();
    const handleEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded-lg shadow-xl py-1 z-50"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {node.isDirectory && onNewFileInFolder && (
        <button
          onClick={() => { onNewFileInFolder(node); onClose(); }}
          className="w-full px-4 py-2 text-sm text-left hover:bg-[var(--geist-accents-1)] flex items-center gap-2"
        >
          <Plus size={14} />
          New File Here
        </button>
      )}
      {node.isDirectory && onUploadToFolder && (
        <button
          onClick={() => { onUploadToFolder(node); onClose(); }}
          className="w-full px-4 py-2 text-sm text-left hover:bg-[var(--geist-accents-1)] flex items-center gap-2"
        >
          <Upload size={14} />
          Upload Files Here
        </button>
      )}
      <button
        onClick={() => { onCopyPath(node); onClose(); }}
        className="w-full px-4 py-2 text-sm text-left hover:bg-[var(--geist-accents-1)] flex items-center gap-2"
      >
        <Copy size={14} />
        Copy Full Path
      </button>
      {onCopyToProject && (
        <button
          onClick={() => { onCopyToProject(node); onClose(); }}
          className="w-full px-4 py-2 text-sm text-left hover:bg-[var(--geist-accents-1)] flex items-center gap-2"
        >
          <Copy size={14} />
          Copy to Project
        </button>
      )}
      <button
        onClick={() => { onRename(node); onClose(); }}
        className="w-full px-4 py-2 text-sm text-left hover:bg-[var(--geist-accents-1)] flex items-center gap-2"
      >
        <Edit2 size={14} />
        Rename
      </button>
      <button
        onClick={() => { onDelete(node); onClose(); }}
        className="w-full px-4 py-2 text-sm text-left hover:bg-[var(--geist-accents-1)] text-[var(--geist-error)] flex items-center gap-2"
      >
        <Trash2 size={14} />
        Delete
      </button>
    </div>
  );
}

interface NewFileDialogProps {
  parentPath: string;
  onClose: () => void;
  onSuccess: () => void;
}

function NewFileDialog({ parentPath, onClose, onSuccess }: NewFileDialogProps) {
  const [fileName, setFileName] = useState("");
  const [template, setTemplate] = useState("markdown");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => e.key === "Escape" && !creating && onClose();
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, creating]);

  const templates: Record<string, string> = {
    markdown: "# New Document\n\n",
    yaml: "# YAML Configuration\n\n",
    json: "{\n  \n}\n",
    drawing: JSON.stringify({
      type: "excalidraw",
      version: 2,
      source: "https://excalidraw.com",
      elements: [],
      appState: {},
      files: {}
    }, null, 2),
  };

  const handleCreate = async () => {
    if (!fileName.trim()) {
      setError("File name is required");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      let finalFileName = fileName;
      if (template === "drawing" && !fileName.endsWith(".excalidraw")) {
        finalFileName = fileName.includes(".") ? fileName.replace(/\.[^.]+$/, ".excalidraw") : `${fileName}.excalidraw`;
      }
      const filePath = `${parentPath}/${finalFileName}`;
      const content = templates[template] || "";
      await invoke("create_file", { path: filePath, content });
      onSuccess();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={creating ? undefined : onClose}>
      <div className="bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded-lg w-80 mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--geist-accents-2)] bg-[var(--geist-accents-1)]">
          <span className="text-xs text-[var(--geist-accents-4)]">New File</span>
          <button
            onClick={onClose}
            disabled={creating}
            className="p-1 text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors disabled:opacity-50"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-3 space-y-3">
          <div>
            <label className="text-xs text-[var(--geist-accents-5)] mb-1 block">File name</label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder={template === "drawing" ? "my-drawing" : "example.md"}
              className="w-full px-2 py-1.5 text-xs bg-[var(--geist-background)] border border-[var(--geist-accents-2)] rounded focus:outline-none focus:border-[var(--geist-accents-4)]"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>

          <div>
            <label className="text-xs text-[var(--geist-accents-5)] mb-1 block">Template</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-[var(--geist-background)] border border-[var(--geist-accents-2)] rounded focus:outline-none focus:border-[var(--geist-accents-4)]"
            >
              <option value="markdown">Markdown</option>
              <option value="yaml">YAML</option>
              <option value="json">JSON</option>
              <option value="drawing">Drawing</option>
            </select>
          </div>

          {error && (
            <div className="p-2 bg-[var(--geist-error-light)] border border-[var(--geist-error)] rounded text-xs text-[var(--geist-error)]">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={creating}
              className="px-2 py-1 text-xs text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-3 py-1 text-xs bg-[var(--monokai-green)] text-black rounded hover:opacity-90 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface NewFolderDialogProps {
  parentPath: string;
  onClose: () => void;
  onSuccess: () => void;
}

function NewFolderDialog({ parentPath, onClose, onSuccess }: NewFolderDialogProps) {
  const [folderName, setFolderName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => e.key === "Escape" && !creating && onClose();
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, creating]);

  const handleCreate = async () => {
    if (!folderName.trim()) {
      setError("Folder name is required");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const folderPath = `${parentPath}/${folderName}`;
      await invoke("create_folder", { path: folderPath });
      onSuccess();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={creating ? undefined : onClose}>
      <div className="bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded-lg w-80 mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--geist-accents-2)] bg-[var(--geist-accents-1)]">
          <span className="text-xs text-[var(--geist-accents-4)]">New Folder</span>
          <button
            onClick={onClose}
            disabled={creating}
            className="p-1 text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors disabled:opacity-50"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-3 space-y-3">
          <div>
            <label className="text-xs text-[var(--geist-accents-5)] mb-1 block">Folder name</label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="my-folder"
              className="w-full px-2 py-1.5 text-xs bg-[var(--geist-background)] border border-[var(--geist-accents-2)] rounded focus:outline-none focus:border-[var(--geist-accents-4)]"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>

          {error && (
            <div className="p-2 bg-[var(--geist-error-light)] border border-[var(--geist-error)] rounded text-xs text-[var(--geist-error)]">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={creating}
              className="px-2 py-1 text-xs text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-3 py-1 text-xs bg-[var(--monokai-green)] text-black rounded hover:opacity-90 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RenameDialogProps {
  node: FileNode;
  onClose: () => void;
  onSuccess: () => void;
}

function RenameDialog({ node, onClose, onSuccess }: RenameDialogProps) {
  const [newName, setNewName] = useState(node.name);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => e.key === "Escape" && !renaming && onClose();
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, renaming]);

  const handleRename = async () => {
    if (!newName.trim()) {
      setError("Name is required");
      return;
    }

    if (newName === node.name) {
      onClose();
      return;
    }

    setRenaming(true);
    setError(null);

    try {
      const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
      const newPath = `${parentPath}/${newName}`;
      await invoke("rename_file_or_folder", { oldPath: node.path, newPath });
      onSuccess();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={renaming ? undefined : onClose}>
      <div className="bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded-lg w-80 mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--geist-accents-2)] bg-[var(--geist-accents-1)]">
          <span className="text-xs text-[var(--geist-accents-4)]">Rename {node.isDirectory ? 'Folder' : 'File'}</span>
          <button
            onClick={onClose}
            disabled={renaming}
            className="p-1 text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors disabled:opacity-50"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-3 space-y-3">
          <div>
            <label className="text-xs text-[var(--geist-accents-5)] mb-1 block">New name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-[var(--geist-background)] border border-[var(--geist-accents-2)] rounded focus:outline-none focus:border-[var(--geist-accents-4)]"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
            />
          </div>

          {error && (
            <div className="p-2 bg-[var(--geist-error-light)] border border-[var(--geist-error)] rounded text-xs text-[var(--geist-error)]">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={renaming}
              className="px-2 py-1 text-xs text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleRename}
              disabled={renaming}
              className="px-3 py-1 text-xs bg-[var(--monokai-green)] text-black rounded hover:opacity-90 disabled:opacity-50"
            >
              {renaming ? "Renaming..." : "Rename"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CopyToProjectDialogProps {
  node: FileNode;
  onClose: () => void;
  onSuccess: () => void;
}

function CopyToProjectDialog({ node, onClose, onSuccess }: CopyToProjectDialogProps) {
  const registeredProjects = useAppStore((s) => s.registeredProjects);
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => e.key === "Escape" && !copying && onClose();
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, copying]);

  const availableProjects = registeredProjects.filter(p => p.id !== activeProjectId);

  const handleCopy = async () => {
    if (!selectedProjectId) {
      setError("Please select a destination project");
      return;
    }

    const destinationProject = registeredProjects.find(p => p.id === selectedProjectId);
    if (!destinationProject) {
      setError("Destination project not found");
      return;
    }

    setCopying(true);
    setError(null);

    try {
      await invoke("copy_resource_to_project", {
        sourcePath: node.path,
        destinationProjectPath: destinationProject.path,
        destinationFolder: null,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={copying ? undefined : onClose}>
      <div className="bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded-lg w-80 mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--geist-accents-2)] bg-[var(--geist-accents-1)]">
          <span className="text-xs text-[var(--geist-accents-4)]">Copy to Project</span>
          <button
            onClick={onClose}
            disabled={copying}
            className="p-1 text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors disabled:opacity-50"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-3 space-y-3">
          <p className="text-xs text-[var(--geist-accents-5)]">
            Copy <strong className="text-[var(--geist-foreground)]">{node.name}</strong> to:
          </p>

          <select
            value={selectedProjectId || ""}
            onChange={(e) => setSelectedProjectId(Number(e.target.value))}
            className="w-full px-2 py-1.5 text-xs bg-[var(--geist-background)] border border-[var(--geist-accents-2)] rounded focus:outline-none focus:border-[var(--geist-accents-4)]"
          >
            <option value="">Select a project...</option>
            {availableProjects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          {availableProjects.length === 0 && (
            <p className="text-xs text-[var(--geist-accents-5)]">
              No other projects available
            </p>
          )}

          {error && (
            <div className="p-2 bg-[var(--geist-error-light)] border border-[var(--geist-error)] rounded text-xs text-[var(--geist-error)]">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={copying}
              className="px-2 py-1 text-xs text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCopy}
              disabled={copying || !selectedProjectId}
              className="px-3 py-1 text-xs bg-[var(--monokai-green)] text-black rounded hover:opacity-90 disabled:opacity-50"
            >
              {copying ? "Copying..." : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DeleteDialogProps {
  node: FileNode;
  onClose: () => void;
  onSuccess: () => void;
}

function DeleteDialog({ node, onClose, onSuccess }: DeleteDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => e.key === "Escape" && !deleting && onClose();
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, deleting]);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      if (node.isDirectory) {
        await invoke("delete_folder", { path: node.path });
      } else {
        await invoke("delete_file", { path: node.path });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={deleting ? undefined : onClose}>
      <div className="bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded-lg w-80 mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--geist-accents-2)] bg-[var(--geist-accents-1)]">
          <span className="text-xs text-[var(--geist-accents-4)]">Delete {node.isDirectory ? 'Folder' : 'File'}</span>
          <button
            onClick={onClose}
            disabled={deleting}
            className="p-1 text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors disabled:opacity-50"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-3 space-y-3">
          <p className="text-xs text-[var(--geist-accents-5)]">
            Delete <strong className="text-[var(--geist-foreground)]">{node.name}</strong>?
          </p>

          {node.isDirectory && (
            <p className="text-xs text-[var(--monokai-red)]">
              This will permanently delete the folder and all its contents.
            </p>
          )}

          {error && (
            <div className="p-2 bg-[var(--geist-error-light)] border border-[var(--geist-error)] rounded text-xs text-[var(--geist-error)]">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              disabled={deleting}
              className="px-2 py-1 text-xs text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1 text-xs bg-[var(--monokai-red)] text-white rounded hover:opacity-90 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResourceBoard() {
  const projectPath = useAppStore((s) => s.projectPath);
  const resourcePanelWidth = useAppStore((s) => s.resourcePanelWidth);
  const setResourcePanelWidth = useAppStore((s) => s.setResourcePanelWidth);
  const [tree, setTree] = useState<FileNode | null>(null);

  const handleResize = useCallback((delta: number) => {
    setResourcePanelWidth(Math.max(150, Math.min(500, resourcePanelWidth + delta)));
  }, [resourcePanelWidth, setResourcePanelWidth]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedIsDirectory, setSelectedIsDirectory] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileParentPath, setNewFileParentPath] = useState<string>("");
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [renameNode, setRenameNode] = useState<FileNode | null>(null);
  const [deleteNode, setDeleteNode] = useState<FileNode | null>(null);
  const [copyToProjectNode, setCopyToProjectNode] = useState<FileNode | null>(null);
  const [contextMenu, setContextMenu] = useState<{ node: FileNode; x: number; y: number } | null>(null);
  const [_uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string[]>([]);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (projectPath) {
      loadResourceTree();
    }
  }, [projectPath]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+C on Mac, Ctrl+Shift+C on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'c') {
        e.preventDefault();
        if (selectedPath && tree) {
          // Find the node by path
          const findNode = (node: FileNode): FileNode | null => {
            if (node.path === selectedPath) return node;
            if (node.children) {
              for (const child of node.children) {
                const found = findNode(child);
                if (found) return found;
              }
            }
            return null;
          };

          const node = findNode(tree);
          if (node) {
            handleCopyPath(node);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedPath, tree]);

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

  const filteredTree = useMemo(() => {
    if (!tree) return null;
    if (searchQuery === "") return tree;
    return filterTree(tree, searchQuery, "all");
  }, [tree, searchQuery]);

  const handleContextMenu = (node: FileNode, event: React.MouseEvent) => {
    setContextMenu({ node, x: event.clientX, y: event.clientY });
  };

  const handleRefresh = () => {
    loadResourceTree();
    setSelectedPath(null);
  };

  const handleCopyPath = async (node: FileNode) => {
    try {
      await navigator.clipboard.writeText(node.path);
      showToast("Copied to clipboard", "success");
    } catch (err) {
      showToast("Failed to copy path", "error");
    }
  };

  const handleFileUpload = async (filePaths: string[], destinationFolder?: string) => {
    if (!projectPath) return;

    setUploading(true);
    setUploadProgress([]);

    for (const filePath of filePaths) {
      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
      try {
        setUploadProgress(prev => [...prev, `Uploading ${fileName}...`]);

        await invoke<string>("upload_resource", {
          projectPath,
          sourcePath: filePath,
          filename: null,
          destinationFolder,
        });

        setUploadProgress(prev => [...prev, `✓ ${fileName} uploaded`]);
      } catch (err) {
        setUploadProgress(prev => [...prev, `✗ ${fileName} failed: ${err}`]);
      }
    }

    setUploading(false);
    setTimeout(() => {
      setUploadProgress([]);
      handleRefresh();
    }, 2000);
  };

  const handleFilePickerClick = async (destinationFolder?: string) => {
    try {
      const selected = await open({
        multiple: true,
        directory: false,
      });

      if (selected && Array.isArray(selected)) {
        await handleFileUpload(selected, destinationFolder);
      } else if (selected && typeof selected === 'string') {
        await handleFileUpload([selected], destinationFolder);
      }
    } catch (err) {
      console.error('File selection cancelled or failed:', err);
    }
  };

  const handleUploadToFolder = async (node: FileNode) => {
    // Extract relative path from resources/
    const pathParts = node.path.split('/resources/');
    const relativePath = pathParts.length > 1 ? pathParts[1] : '';
    await handleFilePickerClick(relativePath);
  };

  const handleNewFileInFolder = (node: FileNode) => {
    setNewFileParentPath(node.path);
    setShowNewFileDialog(true);
  };

  const handleCopyToProject = (node: FileNode) => {
    setCopyToProjectNode(node);
  };

  const handleCopySuccess = () => {
    showToast("Resource copied to project successfully", "success");
  };

  const resourcePath = projectPath ? `${projectPath}/resources` : "";

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--geist-accents-5)]">Loading resources...</p>
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--geist-accents-5)] mb-2">No resources folder found</p>
          <p className="text-xs text-[var(--geist-accents-4)] mb-4">Create resources folder to get started</p>
          <button
            onClick={async () => {
              if (projectPath) {
                try {
                  await invoke("create_folder", { path: `${projectPath}/resources` });
                  loadResourceTree();
                } catch (err) {
                  console.error("Failed to create resources folder:", err);
                }
              }
            }}
            className="px-4 py-2 text-sm bg-[var(--geist-success)] text-white rounded-full hover:opacity-90"
          >
            Create Resources Folder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <div className="flex flex-col bg-[var(--geist-accents-1)] flex-shrink-0" style={{ width: resourcePanelWidth }}>
        <div className="flex items-center justify-between pl-2 pr-3 py-1 border-b border-[var(--geist-accents-2)]">
          <div className="flex items-center gap-1 flex-1">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-2 py-0.5 text-xs bg-transparent text-[var(--geist-accents-4)] placeholder:text-[var(--geist-accents-4)] focus:outline-none focus:text-[var(--geist-foreground)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="p-1 text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <button
              onClick={() => {
                setNewFileParentPath(resourcePath);
                setShowNewFileDialog(true);
              }}
              className="p-1.5 mr-1 text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors"
              title="New file"
            >
              <Plus size={14} />
            </button>
        </div>
        {uploadProgress.length > 0 && (
          <div className="px-2 py-1 border-b border-[var(--geist-accents-2)] text-[10px] space-y-0.5">
            {uploadProgress.map((msg, idx) => (
              <div key={idx} className="text-[var(--geist-accents-5)]">{msg}</div>
            ))}
          </div>
        )}
        <div className="flex-1 overflow-y-auto py-0.5 relative">
          {filteredTree?.children?.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              level={0}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onToggleExpand={(path) => {
                setExpandedPaths(prev => {
                  const next = new Set(prev);
                  if (next.has(path)) {
                    next.delete(path);
                  } else {
                    next.add(path);
                  }
                  return next;
                });
              }}
              onSelect={(path, isDir) => {
                setSelectedPath(path);
                setSelectedIsDirectory(isDir);
              }}
              onContextMenu={handleContextMenu}
            />
          ))}
          {filteredTree?.children?.length === 0 && (
            <p className="px-3 py-2 text-xs text-[var(--geist-accents-4)]">No matching files</p>
          )}
        </div>
      </div>
      <ResizeHandle onResize={handleResize} />
      <div className="flex-1 overflow-auto bg-[var(--geist-background)]">
        {selectedPath && !selectedIsDirectory ? (
          <FilePreview path={selectedPath} />
        ) : selectedPath && selectedIsDirectory ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Folder size={48} className="mx-auto mb-3 text-[var(--geist-accents-4)]" />
              <p className="text-[var(--geist-foreground)] font-medium mb-1">{selectedPath.split('/').pop()}</p>
              <p className="text-xs text-[var(--geist-accents-5)]">Folder selected</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-[var(--geist-accents-5)]">Select a file to preview</p>
          </div>
        )}
      </div>

      {showNewFileDialog && (
        <NewFileDialog
          parentPath={newFileParentPath || resourcePath}
          onClose={() => {
            setShowNewFileDialog(false);
            setNewFileParentPath("");
          }}
          onSuccess={handleRefresh}
        />
      )}

      {showNewFolderDialog && (
        <NewFolderDialog
          parentPath={resourcePath}
          onClose={() => setShowNewFolderDialog(false)}
          onSuccess={handleRefresh}
        />
      )}

      {renameNode && (
        <RenameDialog
          node={renameNode}
          onClose={() => setRenameNode(null)}
          onSuccess={handleRefresh}
        />
      )}

      {deleteNode && (
        <DeleteDialog
          node={deleteNode}
          onClose={() => setDeleteNode(null)}
          onSuccess={handleRefresh}
        />
      )}

      {contextMenu && (
        <ContextMenu
          node={contextMenu.node}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onRename={(node) => setRenameNode(node)}
          onDelete={(node) => setDeleteNode(node)}
          onCopyPath={handleCopyPath}
          onUploadToFolder={handleUploadToFolder}
          onNewFileInFolder={handleNewFileInFolder}
          onCopyToProject={handleCopyToProject}
        />
      )}

      {copyToProjectNode && (
        <CopyToProjectDialog
          node={copyToProjectNode}
          onClose={() => setCopyToProjectNode(null)}
          onSuccess={handleCopySuccess}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} duration={2000} />}
    </div>
  );
}
