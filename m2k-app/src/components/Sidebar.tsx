import { Settings, FolderOpen, Plus, LayoutGrid, ChevronDown, ChevronRight, Folder, AlertTriangle, Files, Brain } from "lucide-react";
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
  const triggerSave = useAppStore((s) => s.triggerSave);
  const setSelectedEpic = useAppStore((s) => s.setSelectedEpic);
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
    setSelectedEpic(null);
    setViewMode("kanban");
  };

  const handleCreateNew = () => {
    triggerSave();
    resetPrdState();
    setViewMode("prd");
  };

  const handleSettings = () => {
    setViewMode("settings");
  };

  const handleResources = () => {
    triggerSave();
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

  return (
    <>
    <aside
      className={`border-r border-[var(--geist-accents-2)] flex flex-col bg-[var(--geist-background)] transition-all duration-300 ease-in-out overflow-hidden ${
        sidebarCollapsed ? 'w-12' : 'w-52'
      }`}
    >
      {/* Logo / Collapse Toggle */}
      <div className={`py-3 border-b border-[var(--geist-accents-2)] flex items-center min-h-[51px] ${
        sidebarCollapsed ? 'justify-center px-1' : 'justify-between px-4'
      }`}>
        {!sidebarCollapsed && (
          <h1 className="text-lg font-semibold whitespace-nowrap transition-opacity duration-200" style={{ color: 'var(--ds-pink-500)' }}>
            M2K
          </h1>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`rounded hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-5)] transition-colors flex-shrink-0 ${
            sidebarCollapsed ? 'p-2' : 'p-1'
          }`}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronRight size={16} />
          ) : (
            <ChevronDown size={16} className="rotate-90" />
          )}
        </button>
      </div>

      {/* Main Actions */}
      <nav className={`py-3 space-y-1 ${sidebarCollapsed ? 'px-1.5' : 'px-2'}`}>
        <button
          onClick={handleBoard}
          className={`w-full rounded-md flex items-center gap-2 transition-all ${
            sidebarCollapsed ? 'p-2 justify-center' : 'px-3 py-2'
          } ${
            viewMode === "kanban"
              ? "bg-[var(--geist-accents-2)] text-[var(--geist-foreground)]"
              : "hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-5)]"
          }`}
          aria-label="View board"
          title={sidebarCollapsed ? "Board" : undefined}
        >
          <LayoutGrid size={16} className="flex-shrink-0" />
          <span className={`text-sm whitespace-nowrap transition-opacity duration-200 ${
            sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'
          }`}>
            Kanban 
          </span>
        </button>

        <button
          onClick={handleResources}
          className={`w-full rounded-md flex items-center gap-2 transition-all ${
            sidebarCollapsed ? 'p-2 justify-center' : 'px-3 py-2'
          } ${
            viewMode === "resources"
              ? "bg-[var(--geist-accents-2)] text-[var(--geist-foreground)]"
              : "hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-5)]"
          }`}
          aria-label="Resources"
          title={sidebarCollapsed ? "Resources" : undefined}
        >
          <Files size={16} className="flex-shrink-0" />
          <span className={`text-sm whitespace-nowrap transition-opacity duration-200 ${
            sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'
          }`}>
            Resources
          </span>
        </button>

        <button
          onClick={handleCreateNew}
          className={`w-full rounded-md flex items-center gap-2 transition-all ${
            sidebarCollapsed ? 'p-2 justify-center' : 'px-3 py-2'
          } ${
            viewMode === "prd"
              ? "bg-[var(--geist-accents-2)] text-[var(--geist-foreground)]"
              : "hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-5)]"
          }`}
          aria-label="PRD Mode"
          title={sidebarCollapsed ? "PRD Mode" : undefined}
        >
          <Brain size={16} className="flex-shrink-0" />
          <span className={`text-sm whitespace-nowrap transition-opacity duration-200 ${
            sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'
          }`}>
            PRD
          </span>
        </button>
      </nav>

      {/* Projects Section */}
      <div className={`flex-1 overflow-hidden flex flex-col transition-opacity duration-200 ${
        sidebarCollapsed ? 'opacity-0' : 'opacity-100'
      }`}>
        {!sidebarCollapsed && (
          <>
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
          </>
        )}
      </div>

      {/* Settings at bottom */}
      <div className={`py-3 border-t border-[var(--geist-accents-2)] ${sidebarCollapsed ? 'px-1.5' : 'px-2'}`}>
        <button
          onClick={handleSettings}
          className={`w-full rounded-md flex items-center gap-2 transition-all ${
            sidebarCollapsed ? 'p-2 justify-center' : 'px-3 py-2'
          } ${
            viewMode === "settings"
              ? "bg-[var(--geist-accents-2)] text-[var(--geist-foreground)]"
              : "hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-5)]"
          }`}
          aria-label={sidebarCollapsed ? "Settings" : "Settings (Cmd+,)"}
          title={sidebarCollapsed ? "Settings (Cmd+,)" : undefined}
        >
          <Settings size={16} className="flex-shrink-0" />
          <span className={`text-sm whitespace-nowrap transition-opacity duration-200 ${
            sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'
          }`}>
            Settings
          </span>
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
