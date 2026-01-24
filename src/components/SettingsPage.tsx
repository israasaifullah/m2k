import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore, Theme, FontSize, FONT_SIZE_VALUES } from "../lib/store";
import { Toast, useToast } from "./Toast";
import { Toggle } from "./Toggle";
import { X, Sun, Moon, Palette, Type } from "lucide-react";
import packageJson from "../../package.json";

const THEMES: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: "dark", label: "Monokai Dark", icon: <Moon size={14} /> },
  { value: "light", label: "Light", icon: <Sun size={14} /> },
  { value: "dracula", label: "Dracula", icon: <Palette size={14} /> },
  { value: "nord", label: "Nord", icon: <Palette size={14} /> },
];

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "X-Large" },
];

interface ProjectSettings {
  project_path: string;
  epic_counter: number;
  ticket_counter: number;
  total_epics: number;
  completed_epics: number;
  total_tickets: number;
  backlog_tickets: number;
  inprogress_tickets: number;
  done_tickets: number;
}

export function SettingsPage() {
  const setViewMode = useAppStore((s) => s.setViewMode);
  const vimMode = useAppStore((s) => s.vimMode);
  const setVimMode = useAppStore((s) => s.setVimMode);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const fontSize = useAppStore((s) => s.fontSize);
  const setFontSize = useAppStore((s) => s.setFontSize);
  const projectPath = useAppStore((s) => s.projectPath);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projectSettings, setProjectSettings] = useState<ProjectSettings | null>(null);
  const [epicCounter, setEpicCounter] = useState(0);
  const [ticketCounter, setTicketCounter] = useState(0);
  const [backupPath, setBackupPath] = useState("");
  const [hasBackupPath, setHasBackupPath] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        // Load project settings if project is loaded
        if (projectPath) {
          const settings = await invoke<ProjectSettings | null>("get_project_settings", {
            projectPath,
          });
          if (settings) {
            setProjectSettings(settings);
            setEpicCounter(settings.epic_counter);
            setTicketCounter(settings.ticket_counter);
          }

          // Load backup path
          const existingBackupPath = await invoke<string | null>("get_m2k_backup_path", {
            projectPath,
          });
          if (existingBackupPath) {
            setBackupPath(existingBackupPath);
            setHasBackupPath(true);
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [projectPath]);

  const handleClose = () => {
    setViewMode("kanban");
  };

  const handleUpdateCounters = async () => {
    if (!projectPath) return;

    setSaving(true);
    try {
      await invoke("update_project_counters", {
        projectPath,
        epicCounter,
        ticketCounter,
      });
      showToast("Counters updated successfully", "success");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(errMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSyncStats = async () => {
    if (!projectPath) return;

    setSaving(true);
    try {
      await invoke("sync_stats_from_files", { projectPath });

      // Refresh settings to show updated stats
      const settings = await invoke<ProjectSettings | null>("get_project_settings", {
        projectPath,
      });
      if (settings) {
        setProjectSettings(settings);
        setEpicCounter(settings.epic_counter);
        setTicketCounter(settings.ticket_counter);
      }

      showToast("Stats synced from files successfully", "success");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(errMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectBackupPath = async () => {
    if (!projectPath) return;

    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Backup Location",
      });

      if (selected) {
        await invoke("set_m2k_backup_path", {
          projectPath,
          backupPath: selected,
        });
        setBackupPath(selected);
        setHasBackupPath(true);
        showToast("Backup path configured successfully", "success");
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(errMsg, "error");
    }
  };

  const handleSyncBackup = async () => {
    if (!projectPath) return;

    setSyncing(true);
    try {
      const destination = await invoke<string>("sync_m2k_backup", { projectPath });
      showToast(`Backup completed: ${destination}`, "success");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      showToast(errMsg, "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleThemeChange = async (newTheme: Theme) => {
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme === "dark" ? "" : newTheme);

    // Set window theme (toolbar color)
    const windowTheme = newTheme === "light" ? "light" : "dark";
    try {
      await getCurrentWindow().setTheme(windowTheme);
    } catch (err) {
      console.error("Failed to set window theme:", err);
    }

    try {
      await invoke("set_app_state_value", {
        key: "theme",
        value: newTheme,
      });
    } catch (err) {
      console.error("Failed to persist theme:", err);
    }
  };

  const handleFontSizeChange = async (newSize: FontSize) => {
    setFontSize(newSize);
    const sizeValue = FONT_SIZE_VALUES[newSize];
    document.documentElement.style.setProperty("--font-size-base", `${sizeValue}px`);

    try {
      await invoke("set_app_state_value", {
        key: "font_size",
        value: newSize,
      });
    } catch (err) {
      console.error("Failed to persist font size:", err);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-sm text-[var(--geist-accents-5)]">Loading...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="px-2 py-1 border-b border-[var(--geist-accents-2)] bg-[var(--geist-accents-1)] flex items-center justify-between">
        <span className="text-xs text-[var(--geist-accents-4)]">Settings</span>
        <button
          onClick={handleClose}
          className="p-1.5 text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors"
          title="Close"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 min-h-0 p-4 overflow-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Appearance */}
          <div className="bg-[var(--geist-accents-1)] border border-[var(--geist-accents-2)] rounded-lg p-4">
            <h2 className="text-sm font-medium text-[var(--geist-foreground)] mb-3">
              Appearance
            </h2>
            <div>
              <label className="text-xs font-medium text-[var(--geist-foreground)] block mb-2">
                Theme
              </label>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => handleThemeChange(t.value)}
                    className={`flex items-center gap-2 px-3 py-2 text-xs rounded border transition-colors ${
                      theme === t.value
                        ? "border-[var(--monokai-green)] bg-[var(--geist-accents-2)] text-[var(--geist-foreground)]"
                        : "border-[var(--geist-accents-3)] text-[var(--geist-accents-5)] hover:border-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)]"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-medium text-[var(--geist-foreground)] block mb-2">
                Font Size
              </label>
              <div className="grid grid-cols-4 gap-2">
                {FONT_SIZES.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => handleFontSizeChange(f.value)}
                    className={`flex items-center justify-center gap-2 px-3 py-2 text-xs rounded border transition-colors ${
                      fontSize === f.value
                        ? "border-[var(--monokai-green)] bg-[var(--geist-accents-2)] text-[var(--geist-foreground)]"
                        : "border-[var(--geist-accents-3)] text-[var(--geist-accents-5)] hover:border-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)]"
                    }`}
                  >
                    <Type size={14} />
                    {f.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[var(--geist-accents-4)] mt-1">
                {FONT_SIZE_VALUES[fontSize]}px base size
              </p>
            </div>
          </div>

          {/* Editor Settings */}
          <div className="bg-[var(--geist-accents-1)] border border-[var(--geist-accents-2)] rounded-lg p-4">
            <h2 className="text-sm font-medium text-[var(--geist-foreground)] mb-3">
              Editor
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="vim-toggle" className="text-xs font-medium text-[var(--geist-foreground)] block mb-0.5">
                  Vim Mode
                </label>
                <p className="text-xs text-[var(--geist-accents-5)]">
                  Enable vim keybindings in editors
                </p>
              </div>
              <Toggle
                id="vim-toggle"
                checked={vimMode}
                onChange={setVimMode}
                label="Vim Mode"
                showLabel={false}
              />
            </div>
          </div>

          {/* .m2k Backup */}
          {projectPath && (
            <div className="bg-[var(--geist-accents-1)] border border-[var(--geist-accents-2)] rounded-lg p-4">
              <h2 className="text-sm font-medium text-[var(--geist-foreground)] mb-3">
                .m2k Backup
              </h2>
              <p className="text-xs text-[var(--geist-accents-5)] mb-3">
                Configure backup location for your .m2k folder.
              </p>

              {hasBackupPath ? (
                <div className="space-y-2">
                  <div className="p-2 bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded">
                    <div className="text-[10px] text-[var(--geist-accents-5)] mb-0.5">Location</div>
                    <div className="text-xs text-[var(--geist-foreground)] font-mono break-all">
                      {backupPath}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSyncBackup}
                      disabled={syncing || saving}
                      className="flex-1 px-3 py-1.5 text-xs bg-[var(--monokai-green)] text-black rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {syncing ? "Syncing..." : "Sync Now"}
                    </button>
                    <button
                      onClick={handleSelectBackupPath}
                      disabled={syncing || saving}
                      className="px-3 py-1.5 text-xs text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors disabled:opacity-50"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSelectBackupPath}
                  disabled={saving}
                  className="w-full px-3 py-1.5 text-xs text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] border border-[var(--geist-accents-3)] rounded transition-colors disabled:opacity-50"
                >
                  Select Backup Location
                </button>
              )}
            </div>
          )}

          {/* Project Counters */}
          {projectPath && projectSettings && (
            <div className="bg-[var(--geist-accents-1)] border border-[var(--geist-accents-2)] rounded-lg p-4">
              <h2 className="text-sm font-medium text-[var(--geist-foreground)] mb-3">
                Project Stats
              </h2>

              {/* Current Stats Display */}
              <div className="mb-3 p-2 bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded">
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div>
                    <span className="text-[var(--geist-accents-5)]">Epics:</span>{" "}
                    <span className="text-[var(--geist-foreground)]">
                      {projectSettings.completed_epics}/{projectSettings.total_epics}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--geist-accents-5)]">Tickets:</span>{" "}
                    <span className="text-[var(--geist-foreground)]">
                      {projectSettings.total_tickets}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--geist-accents-5)]">Backlog:</span>{" "}
                    <span className="text-[var(--geist-foreground)]">
                      {projectSettings.backlog_tickets}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--geist-accents-5)]">In Progress:</span>{" "}
                    <span className="text-[var(--geist-foreground)]">
                      {projectSettings.inprogress_tickets}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--geist-accents-5)]">Done:</span>{" "}
                    <span className="text-[var(--geist-foreground)]">
                      {projectSettings.done_tickets}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleSyncStats}
                  disabled={saving}
                  className="mt-2 w-full px-2 py-1 text-[10px] text-[var(--geist-accents-4)] hover:text-[var(--geist-foreground)] transition-colors disabled:opacity-50"
                >
                  {saving ? "Syncing..." : "Sync Stats from Files"}
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="epic-counter" className="text-xs font-medium text-[var(--geist-foreground)] block mb-1">
                    Next Epic ID
                  </label>
                  <input
                    id="epic-counter"
                    type="number"
                    min="0"
                    value={epicCounter}
                    onChange={(e) => setEpicCounter(parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-xs bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded focus:outline-none focus:border-[var(--geist-accents-4)]"
                  />
                  <p className="text-[10px] text-[var(--geist-accents-4)] mt-0.5">
                    Next: EPIC-{String(epicCounter + 1).padStart(3, '0')}
                  </p>
                </div>

                <div>
                  <label htmlFor="ticket-counter" className="text-xs font-medium text-[var(--geist-foreground)] block mb-1">
                    Next Ticket ID
                  </label>
                  <input
                    id="ticket-counter"
                    type="number"
                    min="0"
                    value={ticketCounter}
                    onChange={(e) => setTicketCounter(parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-xs bg-[var(--geist-background)] border border-[var(--geist-accents-3)] rounded focus:outline-none focus:border-[var(--geist-accents-4)]"
                  />
                  <p className="text-[10px] text-[var(--geist-accents-4)] mt-0.5">
                    Next: T-{String(ticketCounter + 1).padStart(3, '0')}
                  </p>
                </div>

                <button
                  onClick={handleUpdateCounters}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs bg-[var(--monokai-green)] text-black rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? "Updating..." : "Update Counters"}
                </button>
              </div>
            </div>
          )}

          {/* App Version */}
          <div className="text-center text-[10px] text-[var(--geist-accents-4)] py-2">
            M2K v{packageJson.version}
          </div>
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
}
