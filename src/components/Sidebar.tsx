import { Settings, Plus, LayoutGrid, ChevronDown, ChevronRight, Folder, AlertTriangle, Files, Brain } from "lucide-react";
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
      className={`border-r border-[var(--geist-accents-2)] flex flex-col bg-[var(--geist-accents-1)] transition-all duration-200 overflow-hidden ${
        sidebarCollapsed ? 'w-10' : 'w-44'
      }`}
    >
      {/* Logo / Collapse Toggle */}
      <div className={`py-1.5 border-b border-[var(--geist-accents-2)] flex items-center ${
        sidebarCollapsed ? 'justify-center px-1' : 'justify-between px-2'
      }`}>
        {!sidebarCollapsed && (
          <h1 className="text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--ds-pink-500)' }}>
            M2K
          </h1>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`p-1 rounded hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-4)] transition-colors flex-shrink-0`}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronRight size={14} />
          ) : (
            <ChevronDown size={14} className="rotate-90" />
          )}
        </button>
      </div>

      {/* Main Actions */}
      <nav className={`py-1 ${sidebarCollapsed ? 'px-1' : 'px-1'}`}>
        <button
          onClick={handleBoard}
          className={`w-full rounded flex items-center gap-2 transition-colors ${
            sidebarCollapsed ? 'p-1.5 justify-center' : 'px-2 py-1'
          } ${
            viewMode === "kanban"
              ? "bg-[var(--geist-accents-2)] text-[var(--geist-foreground)]"
              : "hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-4)]"
          }`}
          aria-label="View board"
          title={sidebarCollapsed ? "Board" : undefined}
        >
          <LayoutGrid size={14} className="flex-shrink-0" />
          <span className={`text-xs whitespace-nowrap ${sidebarCollapsed ? 'hidden' : ''}`}>Kanban</span>
        </button>

        <button
          onClick={handleResources}
          className={`w-full rounded flex items-center gap-2 transition-colors ${
            sidebarCollapsed ? 'p-1.5 justify-center' : 'px-2 py-1'
          } ${
            viewMode === "resources"
              ? "bg-[var(--geist-accents-2)] text-[var(--geist-foreground)]"
              : "hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-4)]"
          }`}
          aria-label="Resources"
          title={sidebarCollapsed ? "Resources" : undefined}
        >
          <Files size={14} className="flex-shrink-0" />
          <span className={`text-xs whitespace-nowrap ${sidebarCollapsed ? 'hidden' : ''}`}>Resources</span>
        </button>

        <button
          onClick={handleCreateNew}
          className={`w-full rounded flex items-center gap-2 transition-colors ${
            sidebarCollapsed ? 'p-1.5 justify-center' : 'px-2 py-1'
          } ${
            viewMode === "prd"
              ? "bg-[var(--geist-accents-2)] text-[var(--geist-foreground)]"
              : "hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-4)]"
          }`}
          aria-label="PRD Mode"
          title={sidebarCollapsed ? "PRD Mode" : undefined}
        >
          <Brain size={14} className="flex-shrink-0" />
          <span className={`text-xs whitespace-nowrap ${sidebarCollapsed ? 'hidden' : ''}`}>PRD</span>
        </button>
      </nav>

      {/* Projects Section */}
      <div className={`flex-1 overflow-hidden flex flex-col ${sidebarCollapsed ? 'hidden' : ''}`}>
        <button
          onClick={() => setProjectsExpanded(!projectsExpanded)}
          className="px-2 py-1 flex items-center justify-between text-[10px] font-medium text-[var(--geist-accents-4)] uppercase tracking-wider hover:bg-[var(--geist-accents-1)] transition-colors"
        >
          <span>Projects</span>
          {projectsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>

        {projectsExpanded && (
          <div className="flex-1 overflow-y-auto px-1 pb-1">
            {registeredProjects.length === 0 ? (
              <p className="px-2 py-1 text-xs text-[var(--geist-accents-4)]">No projects</p>
            ) : (
              <div>
                {registeredProjects.map((project) => {
                  const isMissing = missingProjects.has(project.id);
                  return (
                    <button
                      key={project.id}
                      onClick={() => handleProjectClick(project)}
                      onContextMenu={(e) => handleProjectContextMenu(e, project)}
                      className={`w-full px-2 py-1 text-xs rounded flex items-center gap-1.5 transition-colors text-left ${
                        isMissing
                          ? "text-[var(--monokai-red)] opacity-70"
                          : project.id === activeProjectId
                          ? "bg-[var(--geist-accents-2)] text-[var(--monokai-green)]"
                          : "hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-4)]"
                      }`}
                      title={isMissing ? `Missing: ${project.path}` : project.path}
                    >
                      {isMissing ? (
                        <AlertTriangle size={12} className="flex-shrink-0" />
                      ) : (
                        <Folder size={12} className="flex-shrink-0" />
                      )}
                      <span className="truncate">{project.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <button
              onClick={selectFolder}
              className="w-full mt-1 px-2 py-1 text-xs rounded flex items-center gap-1.5 hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-4)] transition-colors"
              aria-label="Add project"
            >
              <Plus size={12} />
              Add Project
            </button>
          </div>
        )}
      </div>

      {/* Settings at bottom */}
      <div className={`py-1 border-t border-[var(--geist-accents-2)] ${sidebarCollapsed ? 'px-1' : 'px-1'}`}>
        <button
          onClick={handleSettings}
          className={`w-full rounded flex items-center gap-2 transition-colors ${
            sidebarCollapsed ? 'p-1.5 justify-center' : 'px-2 py-1'
          } ${
            viewMode === "settings"
              ? "bg-[var(--geist-accents-2)] text-[var(--geist-foreground)]"
              : "hover:bg-[var(--geist-accents-1)] text-[var(--geist-accents-4)]"
          }`}
          aria-label={sidebarCollapsed ? "Settings" : "Settings (Cmd+,)"}
          title={sidebarCollapsed ? "Settings (Cmd+,)" : undefined}
        >
          <Settings size={14} className="flex-shrink-0" />
          <span className={`text-xs whitespace-nowrap ${sidebarCollapsed ? 'hidden' : ''}`}>Settings</span>
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
