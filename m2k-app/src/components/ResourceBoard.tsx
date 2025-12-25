import { useState, useEffect, useMemo } from "react";
import { ChevronRight, ChevronDown, Folder, File, FileText, Image, FileCode, Search, X, Plus, FolderPlus, Edit2, Trash2, Save, Upload, Copy } from "lucide-react";
import { useAppStore } from "../lib/store";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { MarkdownEditor } from "./MarkdownEditor";
import { Toast, useToast } from "./Toast";

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
  onSelect: (path: string) => void;
  onContextMenu: (node: FileNode, event: React.MouseEvent) => void;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'md':
    case 'markdown':
      return <FileText size={14} />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return <Image size={14} />;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'py':
    case 'rs':
    case 'go':
    case 'java':
    case 'c':
    case 'cpp':
      return <FileCode size={14} />;
    default:
      return <File size={14} />;
  }
}

function TreeItem({ node, level, selectedPath, onSelect, onContextMenu }: TreeItemProps) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    if (node.isDirectory) {
      setExpanded(!expanded);
    } else {
      onSelect(node.path);
    }
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
        className={`w-full px-2 py-1.5 text-sm flex items-center gap-2 hover:bg-[var(--geist-accents-1)] transition-colors ${
          isSelected ? "bg-[var(--geist-accents-2)] text-[var(--geist-foreground)]" : "text-[var(--geist-accents-5)]"
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {node.isDirectory ? (
          <>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Folder size={14} />
            <span className="flex-1 text-left truncate">{node.name}</span>
            {node.children && <span className="text-xs opacity-50">{node.children.length}</span>}
          </>
        ) : (
          <>
            <span className="w-3.5" />
            {getFileIcon(node.name)}
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
  const [content, setContent] = useState<string | null>(null);
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

  const loadFile = async () => {
    setLoading(true);
    setError(null);
    try {
      const fileContent = await invoke<string>("read_markdown_file", { path });
      setContent(fileContent);
      setEditContent(fileContent);
      const ext = path.split('.').pop()?.toLowerCase();
      const isMarkdown = ['md', 'markdown'].includes(ext || '');
      setEditing(isMarkdown);
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

  const ext = path.split('.').pop()?.toLowerCase();
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '');
  const isMarkdown = ['md', 'markdown'].includes(ext || '');

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

  if (isImage) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <img
          src={`asset://localhost/${encodeURIComponent(path)}`}
          alt={path.split('/').pop()}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    );
  }

  if (isMarkdown && content !== null) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-[var(--geist-accents-2)]">
          <h3 className="text-sm font-medium truncate">{path.split('/').pop()}</h3>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditContent(content);
                    setHasChanges(false);
                  }}
                  className="px-3 py-1 text-sm border border-[var(--geist-accents-3)] rounded-full hover:bg-[var(--geist-accents-1)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className="px-3 py-1 text-sm bg-[var(--geist-success)] text-white rounded-full hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                >
                  <Save size={14} />
                  {saving ? "Saving..." : "Save"}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1 text-sm border border-[var(--geist-accents-3)] rounded-full hover:bg-[var(--geist-accents-1)] flex items-center gap-1"
              >
                <Edit2 size={14} />
                Edit
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 min-h-0">
          {editing ? (
            <div className="h-full p-3">
              <MarkdownEditor value={editContent} onChange={handleEditorChange} />
            </div>
          ) : (
            <div className="h-full overflow-auto p-6">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm">{content}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (content) {
    return (
      <div className="h-full overflow-auto p-6">
        <pre className="text-sm whitespace-pre-wrap font-mono">{content}</pre>
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
}

function ContextMenu({ node, x, y, onClose, onRename, onDelete, onCopyPath }: ContextMenuProps) {
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
      <button
        onClick={() => { onCopyPath(node); onClose(); }}
        className="w-full px-4 py-2 text-sm text-left hover:bg-[var(--geist-accents-1)] flex items-center gap-2"
      >
        <Copy size={14} />
        Copy Relative Path
      </button>
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
  const [template, setTemplate] = useState("blank");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => e.key === "Escape" && !creating && onClose();
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, creating]);

  const templates: Record<string, string> = {
    blank: "",
    markdown: "# New Document\n\n",
    readme: "# README\n\n## Overview\n\n## Usage\n\n",
  };

  const handleCreate = async () => {
    if (!fileName.trim()) {
      setError("File name is required");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const filePath = `${parentPath}/${fileName}`;
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
      <div className="bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">New File</h2>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm text-[var(--geist-accents-5)] mb-1 block">File name</label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="example.md"
              className="w-full px-3 py-2 text-sm bg-[var(--geist-background)] border border-[var(--geist-accents-2)] rounded focus:outline-none focus:border-[var(--geist-accents-4)]"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>

          <div>
            <label className="text-sm text-[var(--geist-accents-5)] mb-1 block">Template</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--geist-background)] border border-[var(--geist-accents-2)] rounded focus:outline-none focus:border-[var(--geist-accents-4)]"
            >
              <option value="blank">Blank</option>
              <option value="markdown">Markdown</option>
              <option value="readme">README</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-[var(--geist-error-light)] border border-[var(--geist-error)] rounded text-sm text-[var(--geist-error)]">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={creating}
            className="px-4 py-2 text-sm border border-[var(--geist-accents-3)] rounded-full hover:bg-[var(--geist-accents-1)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 text-sm bg-[var(--geist-success)] text-white rounded-full hover:opacity-90 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create"}
          </button>
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
      <div className="bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">New Folder</h2>

        <div className="mb-6">
          <label className="text-sm text-[var(--geist-accents-5)] mb-1 block">Folder name</label>
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="my-folder"
            className="w-full px-3 py-2 text-sm bg-[var(--geist-background)] border border-[var(--geist-accents-2)] rounded focus:outline-none focus:border-[var(--geist-accents-4)]"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>

        {error && (
          <div className="p-3 mb-4 bg-[var(--geist-error-light)] border border-[var(--geist-error)] rounded text-sm text-[var(--geist-error)]">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={creating}
            className="px-4 py-2 text-sm border border-[var(--geist-accents-3)] rounded-full hover:bg-[var(--geist-accents-1)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 text-sm bg-[var(--geist-success)] text-white rounded-full hover:opacity-90 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create"}
          </button>
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
      <div className="bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Rename {node.isDirectory ? 'Folder' : 'File'}</h2>

        <div className="mb-6">
          <label className="text-sm text-[var(--geist-accents-5)] mb-1 block">New name</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[var(--geist-background)] border border-[var(--geist-accents-2)] rounded focus:outline-none focus:border-[var(--geist-accents-4)]"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
          />
        </div>

        {error && (
          <div className="p-3 mb-4 bg-[var(--geist-error-light)] border border-[var(--geist-error)] rounded text-sm text-[var(--geist-error)]">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={renaming}
            className="px-4 py-2 text-sm border border-[var(--geist-accents-3)] rounded-full hover:bg-[var(--geist-accents-1)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleRename}
            disabled={renaming}
            className="px-4 py-2 text-sm bg-[var(--geist-success)] text-white rounded-full hover:opacity-90 disabled:opacity-50"
          >
            {renaming ? "Renaming..." : "Rename"}
          </button>
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
      <div className="bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Delete {node.isDirectory ? 'Folder' : 'File'}?</h2>

        <p className="text-sm text-[var(--geist-accents-5)] mb-2">
          Are you sure you want to delete <strong className="text-[var(--geist-foreground)]">{node.name}</strong>?
        </p>

        {node.isDirectory && (
          <p className="text-sm text-[var(--geist-error)] mb-4">
            This will permanently delete the folder and all its contents.
          </p>
        )}

        {error && (
          <div className="p-3 mb-4 bg-[var(--geist-error-light)] border border-[var(--geist-error)] rounded text-sm text-[var(--geist-error)]">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-sm border border-[var(--geist-accents-3)] rounded-full hover:bg-[var(--geist-accents-1)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 text-sm bg-[var(--geist-error)] text-white rounded-full hover:opacity-90 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ResourceBoard() {
  const projectPath = useAppStore((s) => s.projectPath);
  const [tree, setTree] = useState<FileNode | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileType, setFileType] = useState<string>("all");
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [renameNode, setRenameNode] = useState<FileNode | null>(null);
  const [deleteNode, setDeleteNode] = useState<FileNode | null>(null);
  const [contextMenu, setContextMenu] = useState<{ node: FileNode; x: number; y: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string[]>([]);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (projectPath) {
      loadResourceTree();
    }
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

  const filteredTree = useMemo(() => {
    if (!tree) return null;
    if (searchQuery === "" && fileType === "all") return tree;
    return filterTree(tree, searchQuery, fileType);
  }, [tree, searchQuery, fileType]);

  const handleContextMenu = (node: FileNode, event: React.MouseEvent) => {
    setContextMenu({ node, x: event.clientX, y: event.clientY });
  };

  const handleRefresh = () => {
    loadResourceTree();
    setSelectedPath(null);
  };

  const handleCopyPath = async (node: FileNode) => {
    try {
      // Extract relative path (resources/...)
      const pathParts = node.path.split('/resources/');
      const relativePath = pathParts.length > 1 ? `resources/${pathParts[1]}` : node.path;

      await navigator.clipboard.writeText(relativePath);
      showToast("Copied to clipboard", "success");
    } catch (err) {
      showToast("Failed to copy path", "error");
    }
  };

  const handleFileUpload = async (filePaths: string[]) => {
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

  const handleFilePickerClick = async () => {
    try {
      const selected = await open({
        multiple: true,
        directory: false,
      });

      if (selected && Array.isArray(selected)) {
        await handleFileUpload(selected);
      } else if (selected && typeof selected === 'string') {
        await handleFileUpload([selected]);
      }
    } catch (err) {
      console.error('File selection cancelled or failed:', err);
    }
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
          <p className="text-xs text-[var(--geist-accents-4)]">Create a .m2k/resources folder to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <div className="w-64 border-r border-[var(--geist-accents-2)] flex flex-col">
        <div className="p-3 border-b border-[var(--geist-accents-2)]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Resources</h2>
            <div className="flex gap-1">
              <button
                onClick={() => setShowNewFileDialog(true)}
                className="p-1 hover:bg-[var(--geist-accents-1)] rounded"
                title="New file"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={() => setShowNewFolderDialog(true)}
                className="p-1 hover:bg-[var(--geist-accents-1)] rounded"
                title="New folder"
              >
                <FolderPlus size={16} />
              </button>
            </div>
          </div>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-2 top-2 text-[var(--geist-accents-4)]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-sm bg-[var(--geist-background)] border border-[var(--geist-accents-2)] rounded focus:outline-none focus:border-[var(--geist-accents-4)]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)]"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <select
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            className="w-full px-2 py-1.5 text-sm bg-[var(--geist-background)] border border-[var(--geist-accents-2)] rounded focus:outline-none focus:border-[var(--geist-accents-4)]"
          >
            <option value="all">All types</option>
            <option value="markdown">Markdown</option>
            <option value="image">Images</option>
            <option value="code">Code</option>
          </select>
          <button
            onClick={handleFilePickerClick}
            disabled={uploading}
            className="w-full mt-2 px-3 py-2 text-sm bg-[var(--geist-success)] text-white rounded hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Upload size={16} />
            {uploading ? "Uploading..." : "Upload Files"}
          </button>
          {uploadProgress.length > 0 && (
            <div className="mt-2 p-2 bg-[var(--geist-accents-1)] rounded text-xs space-y-1">
              {uploadProgress.map((msg, idx) => (
                <div key={idx} className="text-[var(--geist-accents-6)]">{msg}</div>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-1 relative">
          {filteredTree?.children?.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              level={0}
              selectedPath={selectedPath}
              onSelect={setSelectedPath}
              onContextMenu={handleContextMenu}
            />
          ))}
          {filteredTree?.children?.length === 0 && (
            <p className="px-3 py-2 text-xs text-[var(--geist-accents-4)]">No matching files</p>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-[var(--geist-background)]">
        {selectedPath ? (
          <FilePreview path={selectedPath} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-[var(--geist-accents-5)]">Select a file to preview</p>
          </div>
        )}
      </div>

      {showNewFileDialog && (
        <NewFileDialog
          parentPath={resourcePath}
          onClose={() => setShowNewFileDialog(false)}
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
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} duration={2000} />}
    </div>
  );
}
