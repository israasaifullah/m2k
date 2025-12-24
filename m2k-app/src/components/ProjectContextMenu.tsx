import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Trash2, Edit2, FolderOpen } from "lucide-react";
import { RegisteredProject } from "../lib/store";

interface ProjectContextMenuProps {
  project: RegisteredProject;
  position: { x: number; y: number };
  onClose: () => void;
  onRemove: (project: RegisteredProject) => void;
  onRename: (project: RegisteredProject, newName: string) => void;
}

export function ProjectContextMenu({
  project,
  position,
  onClose,
  onRemove,
  onRename,
}: ProjectContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(project.name);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isRenaming) {
          setIsRenaming(false);
          setNewName(project.name);
        } else if (showConfirmDelete) {
          setShowConfirmDelete(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, isRenaming, showConfirmDelete, project.name]);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleOpenInExplorer = async () => {
    try {
      await invoke("plugin:opener|reveal_item_in_dir", { path: project.path });
    } catch (e) {
      console.error("Failed to open in explorer:", e);
    }
    onClose();
  };

  const handleStartRename = () => {
    setIsRenaming(true);
  };

  const handleConfirmRename = () => {
    if (newName.trim() && newName !== project.name) {
      onRename(project, newName.trim());
    }
    setIsRenaming(false);
    onClose();
  };

  const handleRemoveClick = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmRemove = () => {
    onRemove(project);
    onClose();
  };

  // Adjust position to keep menu on screen
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - 200),
  };

  if (showConfirmDelete) {
    return (
      <div
        ref={menuRef}
        className="fixed z-50 bg-[var(--geist-background)] border border-[var(--geist-accents-2)] rounded-lg shadow-lg p-3 w-64"
        style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
      >
        <p className="text-sm mb-3">
          Remove <strong>{project.name}</strong> from list?
        </p>
        <p className="text-xs text-[var(--geist-accents-5)] mb-3">
          This won't delete any files.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setShowConfirmDelete(false)}
            className="flex-1 px-3 py-1.5 text-sm rounded border border-[var(--geist-accents-3)] hover:bg-[var(--geist-accents-1)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmRemove}
            className="flex-1 px-3 py-1.5 text-sm rounded bg-[var(--geist-error)] text-white hover:opacity-90 transition-opacity"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  if (isRenaming) {
    return (
      <div
        ref={menuRef}
        className="fixed z-50 bg-[var(--geist-background)] border border-[var(--geist-accents-2)] rounded-lg shadow-lg p-3 w-64"
        style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
      >
        <p className="text-xs text-[var(--geist-accents-5)] mb-2">Rename project</p>
        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirmRename();
          }}
          className="w-full px-2 py-1.5 text-sm rounded border border-[var(--geist-accents-3)] bg-[var(--geist-background)] focus:outline-none focus:border-[var(--geist-success)] mb-2"
        />
        <div className="flex gap-2">
          <button
            onClick={() => {
              setIsRenaming(false);
              setNewName(project.name);
            }}
            className="flex-1 px-3 py-1.5 text-sm rounded border border-[var(--geist-accents-3)] hover:bg-[var(--geist-accents-1)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmRename}
            className="flex-1 px-3 py-1.5 text-sm rounded bg-[var(--geist-foreground)] text-[var(--geist-background)] hover:opacity-90 transition-opacity"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-[var(--geist-background)] border border-[var(--geist-accents-2)] rounded-lg shadow-lg py-1 min-w-40"
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
    >
      <button
        onClick={handleOpenInExplorer}
        className="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-[var(--geist-accents-1)] transition-colors text-left"
      >
        <FolderOpen size={14} />
        Open in Finder
      </button>
      <button
        onClick={handleStartRename}
        className="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-[var(--geist-accents-1)] transition-colors text-left"
      >
        <Edit2 size={14} />
        Rename
      </button>
      <div className="h-px bg-[var(--geist-accents-2)] my-1" />
      <button
        onClick={handleRemoveClick}
        className="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-[var(--geist-accents-1)] transition-colors text-left text-[var(--geist-error)]"
      >
        <Trash2 size={14} />
        Remove
      </button>
    </div>
  );
}
