import { useState, useEffect, useMemo } from "react";
import { ChevronRight, ChevronDown, Folder, File, FileText, Image, FileCode, Search, X } from "lucide-react";
import { useAppStore } from "../lib/store";
import { invoke } from "@tauri-apps/api/core";

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

function TreeItem({ node, level, selectedPath, onSelect }: TreeItemProps) {
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

  useEffect(() => {
    loadFile();
  }, [path]);

  const loadFile = async () => {
    setLoading(true);
    setError(null);
    try {
      const fileContent = await invoke<string>("read_markdown_file", { path });
      setContent(fileContent);
    } catch (err) {
      setError(String(err));
      setContent(null);
    } finally {
      setLoading(false);
    }
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

  if (isMarkdown && content) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <pre className="whitespace-pre-wrap text-sm">{content}</pre>
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

export function ResourceBoard() {
  const projectPath = useAppStore((s) => s.projectPath);
  const [tree, setTree] = useState<FileNode | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileType, setFileType] = useState<string>("all");

  useEffect(() => {
    if (projectPath) {
      loadResourceTree();
    }
  }, [projectPath]);

  const loadResourceTree = async () => {
    if (!projectPath) return;

    setLoading(true);
    try {
      const resourcePath = `${projectPath}/.m2k/resources`;
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
          <h2 className="text-sm font-medium mb-3">Resources</h2>
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
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {filteredTree?.children?.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              level={0}
              selectedPath={selectedPath}
              onSelect={setSelectedPath}
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
    </div>
  );
}
