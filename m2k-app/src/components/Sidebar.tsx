import { Settings, FolderOpen, Plus, LayoutGrid, ChevronDown, ChevronRight, Folder, AlertTriangle, Files } from "lucide-react";
import { useAppStore, RegisteredProject } from "../lib/store";
import { useProjectLoader } from "../hooks/useProjectLoader";
import { ProjectContextMenu } from "./ProjectContextMenu";
import { useState, useEffect } from "react";

interface ContextMenuState {
  project: RegisteredProject;
  position: { x: number; y: number };
}

export function Sidebar() {
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const resetPrdState = useAppStore((s) => s.resetPrdState);
  const registeredProjects = useAppStore((s) => s.registeredProjects);
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const { selectFolder, switchToProject, removeProject, renameProject, validateProjectPath } = useProjectLoader();
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [missingProjects, setMissingProjects] = useState<Set<number>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check for missing projects on mount and when projects change
  useEffect(() => {
    const checkProjects = async () => {
      const missing = new Set<number>();
      for (const project of registeredProjects) {
        const isValid = await validateProjectPath(project.path);
        if (!isValid) {
          missing.add(project.id);
        }
      }
      setMissingProjects(missing);
    };
    if (registeredProjects.length > 0) {
      checkProjects();
    }
  }, [registeredProjects, validateProjectPath]);

  // Auto-hide error message
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const handleBoard = () => {
    setViewMode("kanban");
  };

  const handleCreateNew = () => {
    resetPrdState();
    setViewMode("prd");
  };

  const handleSettings = () => {
    setViewMode("settings");
  };

  const handleResources = () => {
    setViewMode("resources");
  };

  const handleProjectClick = async (project: RegisteredProject) => {
    const result = await switchToProject(project);
    if (result.success) {
      setViewMode("kanban");
      // Remove from missing if was previously missing but now found
      if (missingProjects.has(project.id)) {
        setMissingProjects(prev => {
          const next = new Set(prev);
          next.delete(project.id);
          return next;
        });
      }
    } else {
      setErrorMessage(result.error || "Failed to open project");
      setMissingProjects(prev => new Set(prev).add(project.id));
    }
  };

  const handleProjectContextMenu = (e: React.MouseEvent, project: RegisteredProject) => {
    e.preventDefault();
    setContextMenu({
      project,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const handleRemoveProject = (project: RegisteredProject) => {
    removeProject(project);
    setContextMenu(null);
  };

  const handleRenameProject = (project: RegisteredProject, newName: string) => {
    renameProject(project, newName);
    setContextMenu(null);
  };

  if (sidebarCollapsed) {
    return (
      <aside className="w-12 border-r border-[var(--geist-accents-2)] flex flex-col bg-[var(--geist-background)]">
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="p-3 hover:bg-[var(--geist-accents-1)] transition-colors"
          aria-label="Expand sidebar"
        >
          <ChevronRight size={18} />
        </button>
        <nav className="flex-1 flex flex-col items-center py-2 gap-1">
          <button
            onClick={handleBoard}
            className={`p-2 rounded-md transition-colors ${
              viewMode === "kanban"
                ? "bg-[var(--geist-accents-2)]"
                : "hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-5)]"
            }`}
            aria-label="View board"
            title="Board"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={handleResources}
            className={`p-2 rounded-md transition-colors ${
              viewMode === "resources"
                ? "bg-[var(--geist-accents-2)]"
                : "hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-5)]"
            }`}
            aria-label="Resources"
            title="Resources"
          >
            <Files size={18} />
          </button>
          <button
            onClick={handleCreateNew}
            className={`p-2 rounded-md transition-colors ${
              viewMode === "prd"
                ? "bg-[var(--geist-success)] text-white"
                : "hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-5)]"
            }`}
            aria-label="PRD Mode"
            title="PRD Mode"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={selectFolder}
            className="p-2 rounded-md hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-5)] transition-colors"
            aria-label="Add project"
            title="Add Project"
          >
            <FolderOpen size={18} />
          </button>
        </nav>
        <div className="pb-3">
          <button
            onClick={handleSettings}
            className={`p-2 mx-auto block rounded-md transition-colors ${
              viewMode === "settings"
                ? "bg-[var(--geist-accents-2)]"
                : "hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-5)]"
            }`}
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <>
    <aside className="w-52 border-r border-[var(--geist-accents-2)] flex flex-col bg-[var(--geist-background)]">
      {/* Logo */}
      <div className="px-4 py-3 border-b border-[var(--geist-accents-2)] flex items-center justify-between">
        <h1 className="text-lg font-semibold">M2K</h1>
        <button
          onClick={() => setSidebarCollapsed(true)}
          className="p-1 rounded hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-5)] transition-colors"
          aria-label="Collapse sidebar"
        >
          <ChevronDown size={16} className="rotate-90" />
        </button>
      </div>

      {/* Main Actions */}
      <nav className="px-2 py-3 space-y-1">
        <button
          onClick={handleBoard}
          className={`w-full px-3 py-2 text-sm rounded-md flex items-center gap-2 transition-colors ${
            viewMode === "kanban"
              ? "bg-[var(--geist-accents-2)] text-[var(--geist-foreground)]"
              : "hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-5)]"
          }`}
          aria-label="View board"
        >
          <LayoutGrid size={16} />
          Board
        </button>

        <button
          onClick={handleResources}
          className={`w-full px-3 py-2 text-sm rounded-md flex items-center gap-2 transition-colors ${
            viewMode === "resources"
              ? "bg-[var(--geist-accents-2)] text-[var(--geist-foreground)]"
              : "hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-5)]"
          }`}
          aria-label="Resources"
        >
          <Files size={16} />
          Resources
        </button>

        <button
          onClick={handleCreateNew}
          className={`w-full px-3 py-2 text-sm rounded-md flex items-center gap-2 transition-colors ${
            viewMode === "prd"
              ? "bg-[var(--geist-success)] text-white"
              : "hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-5)]"
          }`}
          aria-label="Create new"
        >
          <Plus size={16} />
          New
        </button>
      </nav>

      {/* Projects Section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <button
          onClick={() => setProjectsExpanded(!projectsExpanded)}
          className="px-4 py-2 flex items-center justify-between text-xs font-medium text-[var(--geist-accents-5)] uppercase tracking-wider hover:bg-[var(--geist-accents-1)] transition-colors"
        >
          <span>Projects</span>
          {projectsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {projectsExpanded && (
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {registeredProjects.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[var(--geist-accents-4)]">
                No projects registered
              </p>
            ) : (
              <div className="space-y-1">
                {registeredProjects.map((project) => {
                  const isMissing = missingProjects.has(project.id);
                  return (
                    <button
                      key={project.id}
                      onClick={() => handleProjectClick(project)}
                      onContextMenu={(e) => handleProjectContextMenu(e, project)}
                      className={`w-full px-3 py-2 text-sm rounded-md flex items-center gap-2 transition-colors text-left ${
                        isMissing
                          ? "bg-[var(--geist-error-lighter)] text-[var(--geist-error)] border border-[var(--geist-error)] opacity-70"
                          : project.id === activeProjectId
                          ? "bg-[var(--geist-success-lighter)] text-[var(--geist-success-dark)] border border-[var(--geist-success)]"
                          : "hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-5)]"
                      }`}
                      title={isMissing ? `Missing: ${project.path}` : project.path}
                    >
                      {isMissing ? (
                        <AlertTriangle size={14} className="flex-shrink-0" />
                      ) : (
                        <Folder size={14} className="flex-shrink-0" />
                      )}
                      <span className="truncate">{project.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <button
              onClick={selectFolder}
              className="w-full mt-2 px-3 py-2 text-sm rounded-md flex items-center gap-2 hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-5)] transition-colors border border-dashed border-[var(--geist-accents-3)]"
              aria-label="Add project"
            >
              <Plus size={14} />
              Add Project
            </button>
          </div>
        )}
      </div>

      {/* Settings at bottom */}
      <div className="px-2 py-3 border-t border-[var(--geist-accents-2)]">
        <button
          onClick={handleSettings}
          className={`w-full px-3 py-2 text-sm rounded-md flex items-center gap-2 transition-colors ${
            viewMode === "settings"
              ? "bg-[var(--geist-accents-2)] text-[var(--geist-foreground)]"
              : "hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-5)]"
          }`}
          aria-label="Settings (Cmd+,)"
          title="Settings (Cmd+,)"
        >
          <Settings size={16} />
          Settings
        </button>
      </div>

    </aside>
    {/* Context Menu - rendered outside aside for proper z-index */}
    {contextMenu && (
      <ProjectContextMenu
        project={contextMenu.project}
        position={contextMenu.position}
        onClose={() => setContextMenu(null)}
        onRemove={handleRemoveProject}
        onRename={handleRenameProject}
      />
    )}
    {/* Error toast */}
    {errorMessage && (
      <div className="fixed bottom-4 left-4 z-50 max-w-sm p-3 rounded-lg bg-[var(--geist-error)] text-white text-sm shadow-lg flex items-center gap-2">
        <AlertTriangle size={16} />
        <span className="flex-1">{errorMessage}</span>
        <button
          onClick={() => setErrorMessage(null)}
          className="text-white/80 hover:text-white"
        >
          ×
        </button>
      </div>
    )}
    </>
  );
}
